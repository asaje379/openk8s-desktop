package k8s

import (
	"context"
	"fmt"
	"testing"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"
	metricsv1beta1 "k8s.io/metrics/pkg/apis/metrics/v1beta1"
	metricsfake "k8s.io/metrics/pkg/client/clientset/versioned/fake"
)

// addNodeMetric seeds a NodeMetrics object into a metrics fake clientset.
// The object tracker guesses the resource name from the kind ("nodemetricses"),
// so we seed it explicitly under the correct "nodes" resource.
func addNodeMetric(t *testing.T, mc *metricsfake.Clientset, m *metricsv1beta1.NodeMetrics) {
	t.Helper()
	gvr := metricsv1beta1.SchemeGroupVersion.WithResource("nodes")
	if err := mc.Tracker().Create(gvr, m, m.Namespace); err != nil {
		t.Fatal(err)
	}
}

func addPodMetric(t *testing.T, mc *metricsfake.Clientset, m *metricsv1beta1.PodMetrics) {
	t.Helper()
	gvr := metricsv1beta1.SchemeGroupVersion.WithResource("pods")
	if err := mc.Tracker().Create(gvr, m, m.Namespace); err != nil {
		t.Fatal(err)
	}
}

func TestListNodeMetrics(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.Node{
			ObjectMeta: metav1.ObjectMeta{Name: "node-1"},
			Status: corev1.NodeStatus{
				Allocatable: corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse("2"),
					corev1.ResourceMemory: resource.MustParse("4Gi"),
				},
			},
		},
	)
	metricsClient := metricsfake.NewSimpleClientset()
	addNodeMetric(t, metricsClient, &metricsv1beta1.NodeMetrics{
		ObjectMeta: metav1.ObjectMeta{Name: "node-1"},
		Usage: corev1.ResourceList{
			corev1.ResourceCPU:    resource.MustParse("500m"),
			corev1.ResourceMemory: resource.MustParse("1Gi"),
		},
	})

	list, err := ListNodeMetrics(context.Background(), client, metricsClient)
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 node metric, got %d", len(list))
	}
	m := list[0]
	if m.CPUUsed != "500m" || m.CPUTotal != "2" {
		t.Fatalf("unexpected cpu: used=%q total=%q", m.CPUUsed, m.CPUTotal)
	}
	if m.MemoryUsed != "1 Gi" || m.MemoryTotal != "4 Gi" {
		t.Fatalf("unexpected memory: used=%q total=%q", m.MemoryUsed, m.MemoryTotal)
	}
	if m.CPUUsedMillis != 500 || m.CPUTotalMillis != 2000 {
		t.Fatalf("unexpected cpu millis: %+v", m)
	}
	if m.MemoryUsedBytes != 1<<30 || m.MemoryTotalBytes != 4<<30 {
		t.Fatalf("unexpected memory bytes: %+v", m)
	}
}

func TestListPodMetrics(t *testing.T) {
	metricsClient := metricsfake.NewSimpleClientset()
	addPodMetric(t, metricsClient, &metricsv1beta1.PodMetrics{
		ObjectMeta: metav1.ObjectMeta{Name: "api-1", Namespace: "default"},
		Containers: []metricsv1beta1.ContainerMetrics{
			{
				Name:  "api",
				Usage: corev1.ResourceList{corev1.ResourceCPU: resource.MustParse("100m"), corev1.ResourceMemory: resource.MustParse("128Mi")},
			},
			{
				Name:  "sidecar",
				Usage: corev1.ResourceList{corev1.ResourceCPU: resource.MustParse("200m"), corev1.ResourceMemory: resource.MustParse("64Mi")},
			},
		},
	})

	list, err := ListPodMetrics(context.Background(), metricsClient, "default")
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 pod metric, got %d", len(list))
	}
	p := list[0]
	if p.CPU != "300m" || p.Memory != "192 Mi" {
		t.Fatalf("unexpected pod metrics: cpu=%q memory=%q", p.CPU, p.Memory)
	}
	if p.Namespace != "default" {
		t.Fatalf("unexpected namespace: %q", p.Namespace)
	}
}

func TestGetClusterMetrics(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.Node{
			ObjectMeta: metav1.ObjectMeta{Name: "node-1"},
			Status: corev1.NodeStatus{
				Allocatable: corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse("2"),
					corev1.ResourceMemory: resource.MustParse("4Gi"),
				},
			},
		},
		&corev1.Node{
			ObjectMeta: metav1.ObjectMeta{Name: "node-2"},
			Status: corev1.NodeStatus{
				Allocatable: corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse("4"),
					corev1.ResourceMemory: resource.MustParse("8Gi"),
				},
			},
		},
	)
	metricsClient := metricsfake.NewSimpleClientset()
	addNodeMetric(t, metricsClient, &metricsv1beta1.NodeMetrics{
		ObjectMeta: metav1.ObjectMeta{Name: "node-1"},
		Usage:      corev1.ResourceList{corev1.ResourceCPU: resource.MustParse("500m"), corev1.ResourceMemory: resource.MustParse("1Gi")},
	})
	addNodeMetric(t, metricsClient, &metricsv1beta1.NodeMetrics{
		ObjectMeta: metav1.ObjectMeta{Name: "node-2"},
		Usage:      corev1.ResourceList{corev1.ResourceCPU: resource.MustParse("1"), corev1.ResourceMemory: resource.MustParse("2Gi")},
	})

	m, err := GetClusterMetrics(context.Background(), client, metricsClient, nil)
	if err != nil {
		t.Fatal(err)
	}
	if m.CPUUsed != "1.5" || m.CPUTotal != "6" {
		t.Fatalf("unexpected cluster cpu: used=%q total=%q", m.CPUUsed, m.CPUTotal)
	}
	if m.MemoryUsed != "3 Gi" || m.MemoryTotal != "12 Gi" {
		t.Fatalf("unexpected cluster memory: used=%q total=%q", m.MemoryUsed, m.MemoryTotal)
	}
	if m.CPUUsedMillis != 1500 || m.CPUTotalMillis != 6000 {
		t.Fatalf("unexpected cluster cpu millis: %+v", m)
	}
	if !m.TotalsAvailable {
		t.Fatalf("expected totals available: %+v", m)
	}
}

func TestGetClusterMetricsFallbackToPods(t *testing.T) {
	client := fake.NewSimpleClientset()
	metricsClient := metricsfake.NewSimpleClientset()
	metricsClient.PrependReactor("list", "nodes", func(action k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, fmt.Errorf("nodes.metrics.k8s.io is forbidden")
	})
	addPodMetric(t, metricsClient, &metricsv1beta1.PodMetrics{
		ObjectMeta: metav1.ObjectMeta{Name: "api-1", Namespace: "default"},
		Containers: []metricsv1beta1.ContainerMetrics{
			{
				Name:  "api",
				Usage: corev1.ResourceList{corev1.ResourceCPU: resource.MustParse("300m"), corev1.ResourceMemory: resource.MustParse("192Mi")},
			},
		},
	})

	m, err := GetClusterMetrics(context.Background(), client, metricsClient, []string{"default"})
	if err != nil {
		t.Fatal(err)
	}
	if m.TotalsAvailable {
		t.Fatalf("expected no totals in fallback: %+v", m)
	}
	if m.CPUUsed != "300m" || m.MemoryUsed != "192 Mi" {
		t.Fatalf("unexpected fallback metrics: %+v", m)
	}
	if m.CPUTotal != "" || m.MemoryTotal != "" {
		t.Fatalf("expected empty totals, got %q/%q", m.CPUTotal, m.MemoryTotal)
	}
}
