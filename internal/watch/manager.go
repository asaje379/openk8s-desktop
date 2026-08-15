package watch

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/kubernetes"
)

// Emitter publishes an event to the frontend.
type Emitter func(event string, data any)

// Data is the payload of a watch:data event: the full updated list.
type Data struct {
	ID        string `json:"id"`
	Resource  string `json:"resource"`
	Namespace string `json:"namespace"`
	Items     any    `json:"items"`
}

// Info is the payload of watch:end events.
type Info struct {
	ID        string `json:"id"`
	Resource  string `json:"resource"`
	Namespace string `json:"namespace"`
}

// ErrorInfo is the payload of watch:error events.
type ErrorInfo struct {
	ID        string `json:"id"`
	Resource  string `json:"resource"`
	Namespace string `json:"namespace"`
	Message   string `json:"message"`
}

const defaultDebounce = 300 * time.Millisecond
const maxBackoff = 30 * time.Second

// Manager manages concurrent watch sessions.
type Manager struct {
	mu       sync.Mutex
	watches  map[string]context.CancelFunc
	debounce time.Duration
}

// NewManager creates a new Manager with the default debounce interval.
func NewManager() *Manager {
	return &Manager{
		watches:  make(map[string]context.CancelFunc),
		debounce: defaultDebounce,
	}
}

// SetDebounce overrides the re-list debounce interval (mainly for tests).
func (m *Manager) SetDebounce(d time.Duration) {
	m.debounce = d
}

// Start begins watching a resource and returns a watch id. It emits an
// immediate snapshot, then re-lists (debounced) on every change.
func (m *Manager) Start(ctx context.Context, client kubernetes.Interface, resource string, namespace string, emit Emitter) (string, error) {
	src, ok := sources()[resource]
	if !ok {
		return "", fmt.Errorf("unknown watch resource %q", resource)
	}

	id := uuid.NewString()
	watchCtx, cancel := context.WithCancel(ctx)

	m.mu.Lock()
	m.watches[id] = cancel
	m.mu.Unlock()

	go func() {
		defer func() {
			m.mu.Lock()
			delete(m.watches, id)
			m.mu.Unlock()
			emit("watch:end", Info{ID: id, Resource: resource, Namespace: namespace})
		}()
		m.run(watchCtx, id, client, resource, namespace, src, emit)
	}()

	return id, nil
}

// Stop cancels a watch session.
func (m *Manager) Stop(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if cancel, ok := m.watches[id]; ok {
		cancel()
		delete(m.watches, id)
	}
}

func (m *Manager) run(ctx context.Context, id string, client kubernetes.Interface, resource string, namespace string, src source, emit Emitter) {
	backoff := time.Second
	for ctx.Err() == nil {
		if err := m.snapshot(ctx, id, client, resource, namespace, src, emit); err != nil {
			if !sleep(ctx, backoff) {
				return
			}
			backoff = nextBackoff(backoff)
			continue
		}
		backoff = time.Second

		w, err := src.watch(ctx, client, namespace)
		if err != nil {
			emit("watch:error", ErrorInfo{ID: id, Resource: resource, Namespace: namespace, Message: err.Error()})
			if !sleep(ctx, backoff) {
				return
			}
			backoff = nextBackoff(backoff)
			continue
		}

		if !m.consume(ctx, w, id, client, resource, namespace, src, emit) {
			w.Stop()
			return
		}
		w.Stop()
		// watch closed (timeout/resync): loop back to re-list and re-watch
	}
}

// consume forwards watch events into debounced re-lists. It returns false
// when ctx is done, true when the watch channel is closed.
func (m *Manager) consume(ctx context.Context, w watch.Interface, id string, client kubernetes.Interface, resource string, namespace string, src source, emit Emitter) bool {
	eventCh := w.ResultChan()
	pending := false
	var fire <-chan time.Time

	for {
		select {
		case <-ctx.Done():
			return false
		case _, ok := <-eventCh:
			if !ok {
				return true
			}
			if !pending {
				pending = true
				fire = time.After(m.debounce)
			}
		case <-fire:
			pending = false
			fire = nil
			if err := m.snapshot(ctx, id, client, resource, namespace, src, emit); err != nil {
				emit("watch:error", ErrorInfo{ID: id, Resource: resource, Namespace: namespace, Message: err.Error()})
			}
		}
	}
}

func (m *Manager) snapshot(ctx context.Context, id string, client kubernetes.Interface, resource string, namespace string, src source, emit Emitter) error {
	items, err := src.list(ctx, client, namespace)
	if err != nil {
		return err
	}
	emit("watch:data", Data{ID: id, Resource: resource, Namespace: namespace, Items: items})
	return nil
}

func sleep(ctx context.Context, d time.Duration) bool {
	select {
	case <-ctx.Done():
		return false
	case <-time.After(d):
		return true
	}
}

func nextBackoff(b time.Duration) time.Duration {
	b *= 2
	if b > maxBackoff {
		return maxBackoff
	}
	return b
}
