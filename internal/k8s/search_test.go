package k8s

import (
	"context"
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

func TestSearchResources(t *testing.T) {
	replicas := int32(1)
	client := fake.NewSimpleClientset(
		&corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "api-1", Namespace: "default"}},
		&corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "worker-1", Namespace: "default"}},
		&appsv1.Deployment{
			ObjectMeta: metav1.ObjectMeta{Name: "api", Namespace: "default"},
			Spec: appsv1.DeploymentSpec{
				Replicas: &replicas,
				Template: corev1.PodTemplateSpec{Spec: corev1.PodSpec{Containers: []corev1.Container{{Image: "img"}}}},
			},
		},
		&corev1.Node{ObjectMeta: metav1.ObjectMeta{Name: "api-node"}},
	)

	results, err := SearchResources(context.Background(), client, "default", "api")
	if err != nil {
		t.Fatal(err)
	}

	kinds := map[string]int{}
	for _, r := range results {
		kinds[r.Kind]++
	}
	if kinds["Pod"] != 1 || kinds["Deployment"] != 1 || kinds["Node"] != 1 {
		t.Fatalf("unexpected results: %+v", results)
	}
}

func TestSearchResourcesEmptyQuery(t *testing.T) {
	client := fake.NewSimpleClientset()
	results, err := SearchResources(context.Background(), client, "default", "")
	if err != nil {
		t.Fatal(err)
	}
	if len(results) != 0 {
		t.Fatalf("expected no results for empty query, got %d", len(results))
	}
}

// Search must not be limited to the given namespace: resources in other
// namespaces are found too (global search).
func TestSearchResourcesAcrossNamespaces(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "api-1", Namespace: "default"}},
		&corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "api-2", Namespace: "production"}},
	)
	results, err := SearchResources(context.Background(), client, "default", "api")
	if err != nil {
		t.Fatal(err)
	}
	if len(results) != 2 {
		t.Fatalf("expected both namespaces matched, got %d: %+v", len(results), results)
	}
}

// Search must match partial names, not only full ones.
func TestSearchResourcesPartialName(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "myapp-api-7f9b", Namespace: "default"}},
	)
	results, err := SearchResources(context.Background(), client, "default", "api")
	if err != nil {
		t.Fatal(err)
	}
	if len(results) != 1 || results[0].Name != "myapp-api-7f9b" {
		t.Fatalf("expected partial match, got %+v", results)
	}
}

func TestSearchResourcesCaseInsensitive(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: "MyService", Namespace: "default"}},
	)
	results, err := SearchResources(context.Background(), client, "default", "myservice")
	if err != nil {
		t.Fatal(err)
	}
	if len(results) != 1 || results[0].Name != "MyService" || results[0].Kind != "Service" {
		t.Fatalf("unexpected results: %+v", results)
	}
}
