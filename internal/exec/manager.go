package exec

import (
	"context"
	"fmt"
	"io"
	"sync"

	"github.com/google/uuid"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/remotecommand"
)

// Emitter publishes an event to the frontend.
type Emitter func(event string, data any)

type session struct {
	cancel   context.CancelFunc
	stdin    io.WriteCloser
	resizeCh chan remotecommand.TerminalSize
}

// Manager manages interactive exec sessions.
type Manager struct {
	mu       sync.Mutex
	sessions map[string]*session
}

// NewManager creates a new Manager.
func NewManager() *Manager {
	return &Manager{sessions: make(map[string]*session)}
}

// Start opens an interactive exec session and returns a session id.
func (m *Manager) Start(
	ctx context.Context,
	client kubernetes.Interface,
	restCfg *rest.Config,
	namespace string,
	pod string,
	container string,
	command string,
	emit Emitter,
) (string, error) {
	id := uuid.NewString()
	sessionCtx, cancel := context.WithCancel(ctx)

	pr, pw := io.Pipe()
	resizeCh := make(chan remotecommand.TerminalSize, 1)

	s := &session{cancel: cancel, stdin: pw, resizeCh: resizeCh}
	m.mu.Lock()
	m.sessions[id] = s
	m.mu.Unlock()

	go func() {
		defer func() {
			pw.Close()
			m.mu.Lock()
			delete(m.sessions, id)
			m.mu.Unlock()
			emit("exec:end", map[string]any{"sessionId": id})
		}()
		err := runExec(sessionCtx, client, restCfg, namespace, pod, container, command, pr, resizeCh, func(data string) {
			emit("exec:output", map[string]any{"sessionId": id, "data": data})
		})
		if err != nil && sessionCtx.Err() == nil {
			emit("exec:error", map[string]any{"sessionId": id, "message": err.Error()})
		}
	}()

	return id, nil
}

// Write sends input to a session's stdin.
func (m *Manager) Write(id string, data string) error {
	m.mu.Lock()
	s, ok := m.sessions[id]
	m.mu.Unlock()
	if !ok {
		return fmt.Errorf("session %q not found", id)
	}
	_, err := io.WriteString(s.stdin, data)
	return err
}

// Resize resizes the terminal of a session.
func (m *Manager) Resize(id string, cols int, rows int) error {
	m.mu.Lock()
	s, ok := m.sessions[id]
	m.mu.Unlock()
	if !ok {
		return fmt.Errorf("session %q not found", id)
	}
	select {
	case s.resizeCh <- remotecommand.TerminalSize{Width: uint16(cols), Height: uint16(rows)}:
	default:
	}
	return nil
}

// Close closes a session.
func (m *Manager) Close(id string) {
	m.mu.Lock()
	s, ok := m.sessions[id]
	m.mu.Unlock()
	if ok {
		s.cancel()
	}
}

type outputWriter struct {
	onData func(string)
}

func (w *outputWriter) Write(p []byte) (int, error) {
	w.onData(string(p))
	return len(p), nil
}

type sizeQueue struct {
	ch <-chan remotecommand.TerminalSize
}

func (q *sizeQueue) Next() *remotecommand.TerminalSize {
	s, ok := <-q.ch
	if !ok {
		return nil
	}
	return &s
}

func runExec(
	ctx context.Context,
	client kubernetes.Interface,
	restCfg *rest.Config,
	namespace string,
	pod string,
	container string,
	command string,
	stdin io.Reader,
	resizeCh <-chan remotecommand.TerminalSize,
	onOutput func(string),
) error {
	req := client.CoreV1().RESTClient().Post().
		Resource("pods").
		Name(pod).
		Namespace(namespace).
		SubResource("exec").
		VersionedParams(&corev1.PodExecOptions{
			Container: container,
			Command:   []string{command},
			Stdin:     true,
			Stdout:    true,
			Stderr:    true,
			TTY:       true,
		}, scheme.ParameterCodec)

	spdy, err := remotecommand.NewSPDYExecutor(restCfg, "POST", req.URL())
	if err != nil {
		return fmt.Errorf("create executor: %w", err)
	}

	out := &outputWriter{onData: onOutput}
	return spdy.StreamWithContext(ctx, remotecommand.StreamOptions{
		Stdin:             stdin,
		Stdout:            out,
		Stderr:            out,
		Tty:               true,
		TerminalSizeQueue: &sizeQueue{ch: resizeCh},
	})
}
