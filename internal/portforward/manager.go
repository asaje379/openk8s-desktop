package portforward

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"sync"

	"github.com/google/uuid"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/portforward"
	"k8s.io/client-go/transport/spdy"
)

// Emitter publishes an event to the frontend.
type Emitter func(event string, data any)

// Manager manages port-forward sessions.
type Manager struct {
	mu       sync.Mutex
	forwards map[string]context.CancelFunc
}

// NewManager creates a new Manager.
func NewManager() *Manager {
	return &Manager{forwards: make(map[string]context.CancelFunc)}
}

// Start begins a port-forward from a local port to a pod port and returns a
// forward id.
func (m *Manager) Start(
	ctx context.Context,
	client kubernetes.Interface,
	restCfg *rest.Config,
	namespace string,
	pod string,
	localPort int,
	remotePort int,
	emit Emitter,
) (string, error) {
	id := uuid.NewString()
	fwdCtx, cancel := context.WithCancel(ctx)

	m.mu.Lock()
	m.forwards[id] = cancel
	m.mu.Unlock()

	ready := make(chan struct{})

	go func() {
		defer func() {
			m.mu.Lock()
			delete(m.forwards, id)
			m.mu.Unlock()
			emit("portforward:end", map[string]any{"forwardId": id})
		}()
		err := run(fwdCtx, client, restCfg, namespace, pod, localPort, remotePort, ready)
		if err != nil && fwdCtx.Err() == nil {
			emit("portforward:error", map[string]any{"forwardId": id, "message": err.Error()})
		}
	}()

	go func() {
		select {
		case <-ready:
			emit("portforward:ready", map[string]any{
				"forwardId":  id,
				"localPort":  localPort,
				"remotePort": remotePort,
			})
		case <-fwdCtx.Done():
		}
	}()

	return id, nil
}

// Stop cancels a port-forward.
func (m *Manager) Stop(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if cancel, ok := m.forwards[id]; ok {
		cancel()
		delete(m.forwards, id)
	}
}

func run(
	ctx context.Context,
	client kubernetes.Interface,
	restCfg *rest.Config,
	namespace string,
	pod string,
	localPort int,
	remotePort int,
	ready chan struct{},
) error {
	url := client.CoreV1().RESTClient().Post().
		Resource("pods").
		Namespace(namespace).
		Name(pod).
		SubResource("portforward").
		URL()

	transport, upgrader, err := spdy.RoundTripperFor(restCfg)
	if err != nil {
		return fmt.Errorf("create round tripper: %w", err)
	}
	dialer := spdy.NewDialer(upgrader, &http.Client{Transport: transport}, "POST", url)

	fw, err := portforward.NewOnAddresses(
		dialer,
		[]string{"127.0.0.1"},
		[]string{fmt.Sprintf("%d:%d", localPort, remotePort)},
		ctx.Done(),
		ready,
		io.Discard,
		io.Discard,
	)
	if err != nil {
		return fmt.Errorf("create port forward: %w", err)
	}
	return fw.ForwardPorts()
}
