package logs

import (
	"context"
	"io"
	"strings"
	"sync"

	"github.com/google/uuid"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"
)

// Emitter publishes an event to the frontend.
type Emitter func(event string, data any)

// Manager manages concurrent pod log streams.
type Manager struct {
	mu      sync.Mutex
	streams map[string]context.CancelFunc
}

// NewManager creates a new Manager.
func NewManager() *Manager {
	return &Manager{streams: make(map[string]context.CancelFunc)}
}

// Start begins streaming logs for a single pod/container.
func (m *Manager) Start(
	ctx context.Context,
	client kubernetes.Interface,
	namespace string,
	pod string,
	container string,
	tailLines int64,
	follow bool,
	emit Emitter,
) string {
	return m.startMulti(ctx, client, namespace, []string{pod}, container, tailLines, follow, false, emit)
}

// StartMulti begins streaming logs from multiple pods, prefixing each line
// with the pod name.
func (m *Manager) StartMulti(
	ctx context.Context,
	client kubernetes.Interface,
	namespace string,
	pods []string,
	container string,
	tailLines int64,
	follow bool,
	emit Emitter,
) string {
	return m.startMulti(ctx, client, namespace, pods, container, tailLines, follow, true, emit)
}

func (m *Manager) startMulti(
	ctx context.Context,
	client kubernetes.Interface,
	namespace string,
	pods []string,
	container string,
	tailLines int64,
	follow bool,
	prefixPods bool,
	emit Emitter,
) string {
	id := uuid.NewString()
	streamCtx, cancel := context.WithCancel(ctx)

	m.mu.Lock()
	m.streams[id] = cancel
	m.mu.Unlock()

	var wg sync.WaitGroup
	for _, pod := range pods {
		wg.Add(1)
		go func(podName string) {
			defer wg.Done()
			m.streamPod(streamCtx, id, client, namespace, podName, container, tailLines, follow, prefixPods, emit)
		}(pod)
	}

	go func() {
		wg.Wait()
		m.mu.Lock()
		delete(m.streams, id)
		m.mu.Unlock()
		emit("logs:end", map[string]any{"streamId": id})
	}()

	return id
}

// Stop cancels a log stream.
func (m *Manager) Stop(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if cancel, ok := m.streams[id]; ok {
		cancel()
		delete(m.streams, id)
	}
}

func (m *Manager) streamPod(
	ctx context.Context,
	id string,
	client kubernetes.Interface,
	namespace string,
	pod string,
	container string,
	tailLines int64,
	follow bool,
	prefixPods bool,
	emit Emitter,
) {
	opts := &corev1.PodLogOptions{Container: container, Follow: follow}
	if tailLines > 0 {
		opts.TailLines = &tailLines
	}

	stream, err := client.CoreV1().Pods(namespace).GetLogs(pod, opts).Stream(ctx)
	if err != nil {
		emit("logs:error", map[string]any{"streamId": id, "message": err.Error()})
		return
	}
	defer stream.Close()

	buf := make([]byte, 8192)
	for {
		n, err := stream.Read(buf)
		if n > 0 {
			data := string(buf[:n])
			if prefixPods {
				data = prefixLines(pod, data)
			}
			emit("logs:data", map[string]any{"streamId": id, "data": data})
		}
		if err != nil {
			if err != io.EOF {
				emit("logs:error", map[string]any{"streamId": id, "message": err.Error()})
			}
			return
		}
	}
}

func prefixLines(pod string, data string) string {
	return "[" + pod + "] " + strings.ReplaceAll(data, "\n", "\n["+pod+"] ")
}
