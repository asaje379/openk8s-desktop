package k8s

import (
	"context"
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

func TestListNamespaces(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "default"}},
		&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "kube-system"}},
	)
	list, err := ListNamespaces(context.Background(), client)
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 2 {
		t.Fatalf("expected 2 namespaces, got %d", len(list))
	}
	if list[0].Name != "default" {
		t.Fatalf("expected sorted first 'default', got %q", list[0].Name)
	}
}

func TestListPods(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.Pod{
			ObjectMeta: metav1.ObjectMeta{Name: "api-1", Namespace: "default"},
			Spec:       corev1.PodSpec{NodeName: "node-1"},
			Status: corev1.PodStatus{
				Phase: corev1.PodRunning,
				ContainerStatuses: []corev1.ContainerStatus{
					{Ready: true, RestartCount: 0},
					{Ready: false, RestartCount: 2},
				},
				PodIP: "10.0.0.1",
			},
		},
	)
	list, err := ListPods(context.Background(), client, "default")
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 pod, got %d", len(list))
	}
	if list[0].Ready != "1/2" {
		t.Fatalf("expected ready 1/2, got %q", list[0].Ready)
	}
	if list[0].Restarts != 2 {
		t.Fatalf("expected 2 restarts, got %d", list[0].Restarts)
	}
	if list[0].Node != "node-1" || list[0].IP != "10.0.0.1" {
		t.Fatalf("unexpected pod node/ip: %+v", list[0])
	}
}

func TestListDeployments(t *testing.T) {
	replicas := int32(3)
	client := fake.NewSimpleClientset(
		&appsv1.Deployment{
			ObjectMeta: metav1.ObjectMeta{Name: "api", Namespace: "default"},
			Spec: appsv1.DeploymentSpec{
				Replicas: &replicas,
				Template: corev1.PodTemplateSpec{
					Spec: corev1.PodSpec{
						Containers: []corev1.Container{{Image: "myregistry/api:v1"}},
					},
				},
			},
			Status: appsv1.DeploymentStatus{ReadyReplicas: 3, AvailableReplicas: 3},
		},
	)
	list, err := ListDeployments(context.Background(), client, "default")
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 deployment, got %d", len(list))
	}
	if list[0].Desired != 3 || list[0].Image != "myregistry/api:v1" {
		t.Fatalf("unexpected deployment: %+v", list[0])
	}
}

func TestGetPod(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.Pod{
			ObjectMeta: metav1.ObjectMeta{Name: "api-1", Namespace: "default", Labels: map[string]string{"app": "api"}},
			Spec:       corev1.PodSpec{NodeName: "node-1"},
			Status: corev1.PodStatus{
				Phase: corev1.PodRunning,
				ContainerStatuses: []corev1.ContainerStatus{
					{
						Name:  "api",
						Image: "myregistry/api:v1",
						Ready: true,
						State: corev1.ContainerState{Running: &corev1.ContainerStateRunning{}},
					},
				},
			},
		},
	)
	detail, err := GetPod(context.Background(), client, "default", "api-1")
	if err != nil {
		t.Fatal(err)
	}
	if detail.Status != "Running" || detail.Node != "node-1" {
		t.Fatalf("unexpected detail: %+v", detail)
	}
	if len(detail.Containers) != 1 || detail.Containers[0].State != "running" {
		t.Fatalf("unexpected containers: %+v", detail.Containers)
	}
	if detail.Labels["app"] != "api" {
		t.Fatalf("unexpected labels: %+v", detail.Labels)
	}
}

func TestListEvents(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.Event{
			ObjectMeta:     metav1.ObjectMeta{Name: "evt-1", Namespace: "default"},
			InvolvedObject: corev1.ObjectReference{Kind: "Pod", Name: "api-1", Namespace: "default"},
			Type:           "Warning",
			Reason:         "BackOff",
			Message:        "Back-off restarting failed container",
		},
	)
	list, err := ListEvents(context.Background(), client, "default")
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 event, got %d", len(list))
	}
	if list[0].Object != "api-1" || list[0].Type != "Warning" {
		t.Fatalf("unexpected event: %+v", list[0])
	}
}
