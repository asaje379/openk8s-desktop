package k8s

import (
	"context"
	"testing"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

const podYAML = `apiVersion: v1
kind: Pod
metadata:
  name: nginx
  namespace: default
  labels:
    app: nginx
spec:
  containers:
  - name: nginx
    image: nginx:latest
`

func TestApplyPodCreate(t *testing.T) {
	client := fake.NewSimpleClientset()
	if err := ApplyPod(context.Background(), client, "default", "nginx", podYAML); err != nil {
		t.Fatal(err)
	}
	pod, err := client.CoreV1().Pods("default").Get(context.Background(), "nginx", metav1.GetOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if pod.Labels["app"] != "nginx" {
		t.Fatalf("expected label app=nginx, got %v", pod.Labels)
	}
}

func TestApplyPodUpdate(t *testing.T) {
	client := fake.NewSimpleClientset(&corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "nginx", Namespace: "default"}})
	if err := ApplyPod(context.Background(), client, "default", "nginx", podYAML); err != nil {
		t.Fatal(err)
	}
	pod, err := client.CoreV1().Pods("default").Get(context.Background(), "nginx", metav1.GetOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if pod.Labels["app"] != "nginx" {
		t.Fatalf("expected label app=nginx after update, got %v", pod.Labels)
	}
}

func TestApplyPodInvalidYAML(t *testing.T) {
	client := fake.NewSimpleClientset()
	if err := ApplyPod(context.Background(), client, "default", "nginx", "not: [valid"); err == nil {
		t.Fatal("expected error for invalid YAML")
	}
}

func TestDeletePod(t *testing.T) {
	client := fake.NewSimpleClientset(&corev1.Pod{ObjectMeta: metav1.ObjectMeta{Name: "nginx", Namespace: "default"}})
	if err := DeletePod(context.Background(), client, "default", "nginx"); err != nil {
		t.Fatal(err)
	}
	_, err := client.CoreV1().Pods("default").Get(context.Background(), "nginx", metav1.GetOptions{})
	if !apierrors.IsNotFound(err) {
		t.Fatalf("expected NotFound after delete, got %v", err)
	}
}

const deploymentYAML = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: api:v1
`

func TestApplyDeploymentUpdate(t *testing.T) {
	replicas := int32(2)
	client := fake.NewSimpleClientset(&appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: "api", Namespace: "default"},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Template: corev1.PodTemplateSpec{Spec: corev1.PodSpec{Containers: []corev1.Container{{Image: "old"}}}},
		},
	})
	if err := ApplyDeployment(context.Background(), client, "default", "api", deploymentYAML); err != nil {
		t.Fatal(err)
	}
	d, err := client.AppsV1().Deployments("default").Get(context.Background(), "api", metav1.GetOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if d.Spec.Template.Spec.Containers[0].Image != "api:v1" {
		t.Fatalf("expected image api:v1 after update, got %s", d.Spec.Template.Spec.Containers[0].Image)
	}
}

func TestDeleteDeployment(t *testing.T) {
	client := fake.NewSimpleClientset(&appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: "api", Namespace: "default"}})
	if err := DeleteDeployment(context.Background(), client, "default", "api"); err != nil {
		t.Fatal(err)
	}
	_, err := client.AppsV1().Deployments("default").Get(context.Background(), "api", metav1.GetOptions{})
	if !apierrors.IsNotFound(err) {
		t.Fatalf("expected NotFound after delete, got %v", err)
	}
}

func TestRestartWorkloads(t *testing.T) {
	client := fake.NewSimpleClientset(
		&appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: "api", Namespace: "default"}},
		&appsv1.StatefulSet{ObjectMeta: metav1.ObjectMeta{Name: "db", Namespace: "default"}},
		&appsv1.DaemonSet{ObjectMeta: metav1.ObjectMeta{Name: "agent", Namespace: "default"}},
	)

	cases := []struct {
		name string
		run  func() error
	}{
		{"deployment", func() error { return RestartDeployment(context.Background(), client, "default", "api") }},
		{"statefulset", func() error { return RestartStatefulSet(context.Background(), client, "default", "db") }},
		{"daemonset", func() error { return RestartDaemonSet(context.Background(), client, "default", "agent") }},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if err := tc.run(); err != nil {
				t.Fatal(err)
			}
		})
	}

	d, _ := client.AppsV1().Deployments("default").Get(context.Background(), "api", metav1.GetOptions{})
	if d.Spec.Template.Annotations["kubectl.kubernetes.io/restartedAt"] == "" {
		t.Fatalf("expected restartedAt annotation on deployment, got %v", d.Spec.Template.Annotations)
	}
	s, _ := client.AppsV1().StatefulSets("default").Get(context.Background(), "db", metav1.GetOptions{})
	if s.Spec.Template.Annotations["kubectl.kubernetes.io/restartedAt"] == "" {
		t.Fatalf("expected restartedAt annotation on statefulset, got %v", s.Spec.Template.Annotations)
	}
	ds, _ := client.AppsV1().DaemonSets("default").Get(context.Background(), "agent", metav1.GetOptions{})
	if ds.Spec.Template.Annotations["kubectl.kubernetes.io/restartedAt"] == "" {
		t.Fatalf("expected restartedAt annotation on daemonset, got %v", ds.Spec.Template.Annotations)
	}
}