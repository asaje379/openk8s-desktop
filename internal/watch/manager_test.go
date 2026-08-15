package watch

import (
	"context"
	"sync"
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"

	"openk8s-desktop/internal/k8s"
)

func waitFor(t *testing.T, d time.Duration, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(d)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("condition not met in time")
}

func TestStartUnknownResource(t *testing.T) {
	m := NewManager()
	client := fake.NewSimpleClientset()
	_, err := m.Start(context.Background(), client, "nope", "", func(string, any) {})
	if err == nil {
		t.Fatal("expected error for unknown resource")
	}
}

func TestWatchPods(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.Pod{
			ObjectMeta: metav1.ObjectMeta{Name: "api-1", Namespace: "default"},
			Status:     corev1.PodStatus{Phase: corev1.PodRunning},
		},
	)

	m := NewManager()
	m.SetDebounce(20 * time.Millisecond)

	var mu sync.Mutex
	var dataEvents []Data
	ended := false

	emit := func(name string, data any) {
		mu.Lock()
		defer mu.Unlock()
		switch name {
		case "watch:data":
			dataEvents = append(dataEvents, data.(Data))
		case "watch:end":
			ended = true
		}
	}

	id, err := m.Start(context.Background(), client, "pods", "default", emit)
	if err != nil {
		t.Fatal(err)
	}

	waitFor(t, 2*time.Second, func() bool {
		mu.Lock()
		defer mu.Unlock()
		return len(dataEvents) >= 1
	})

	_, err = client.CoreV1().Pods("default").Create(context.Background(),
		&corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "api-2", Namespace: "default"}},
		metav1.CreateOptions{})
	if err != nil {
		t.Fatal(err)
	}

	waitFor(t, 2*time.Second, func() bool {
		mu.Lock()
		defer mu.Unlock()
		for _, e := range dataEvents {
			if pods, ok := e.Items.([]k8s.PodInfo); ok && len(pods) == 2 {
				return true
			}
		}
		return false
	})

	m.Stop(id)
	waitFor(t, 2*time.Second, func() bool {
		mu.Lock()
		defer mu.Unlock()
		return ended
	})
}
