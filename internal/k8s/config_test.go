package k8s

import (
	"context"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

func TestListConfigMaps(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{Name: "app-config", Namespace: "default"},
			Data:       map[string]string{"KEY_A": "a", "KEY_B": "b"},
		},
	)
	list, err := ListConfigMaps(context.Background(), client, "default")
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 configmap, got %d", len(list))
	}
	if list[0].Name != "app-config" || len(list[0].Keys) != 2 {
		t.Fatalf("unexpected configmap: %+v", list[0])
	}
	if list[0].Keys[0] != "KEY_A" || list[0].Keys[1] != "KEY_B" {
		t.Fatalf("expected sorted keys, got %v", list[0].Keys)
	}
}

func TestApplyConfigMap(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{Name: "app-config", Namespace: "default"},
			Data:       map[string]string{"KEY": "old"},
		},
	)
	err := ApplyConfigMap(context.Background(), client, "default", "app-config", `apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
data:
  KEY: new
  OTHER: value
`)
	if err != nil {
		t.Fatal(err)
	}
	cm, err := client.CoreV1().ConfigMaps("default").Get(context.Background(), "app-config", metav1.GetOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if cm.Data["KEY"] != "new" || cm.Data["OTHER"] != "value" {
		t.Fatalf("unexpected data: %v", cm.Data)
	}
}

func TestApplyConfigMapInvalidYAML(t *testing.T) {
	client := fake.NewSimpleClientset()
	err := ApplyConfigMap(context.Background(), client, "default", "app-config", "not: [valid")
	if err == nil {
		t.Fatal("expected invalid YAML error")
	}
}

func TestDeleteConfigMap(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: "app-config", Namespace: "default"}},
	)
	if err := DeleteConfigMap(context.Background(), client, "default", "app-config"); err != nil {
		t.Fatal(err)
	}
	_, err := client.CoreV1().ConfigMaps("default").Get(context.Background(), "app-config", metav1.GetOptions{})
	if err == nil {
		t.Fatal("expected configmap to be deleted")
	}
}

func TestListSecrets(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{Name: "db-secret", Namespace: "default"},
			Type:       corev1.SecretTypeOpaque,
			Data:       map[string][]byte{"password": []byte("hunter2")},
		},
	)
	list, err := ListSecrets(context.Background(), client, "default")
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 secret, got %d", len(list))
	}
	if list[0].Name != "db-secret" || list[0].Type != "Opaque" || len(list[0].Keys) != 1 {
		t.Fatalf("unexpected secret: %+v", list[0])
	}
}

func TestGetSecretDetail(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{Name: "db-secret", Namespace: "default"},
			Type:       corev1.SecretTypeOpaque,
			Data:       map[string][]byte{"password": []byte("hunter2")},
		},
	)
	detail, err := GetSecret(context.Background(), client, "default", "db-secret")
	if err != nil {
		t.Fatal(err)
	}
	if detail.Data["password"] != "hunter2" {
		t.Fatalf("unexpected secret data: %+v", detail.Data)
	}
}

func TestApplySecret(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{Name: "db-secret", Namespace: "default"},
			Type:       corev1.SecretTypeOpaque,
			Data:       map[string][]byte{"password": []byte("old")},
		},
	)
	err := ApplySecret(context.Background(), client, "default", "db-secret", `apiVersion: v1
kind: Secret
metadata:
  name: db-secret
  namespace: default
type: Opaque
data:
  password: bmV3
`)
	if err != nil {
		t.Fatal(err)
	}
	s, err := client.CoreV1().Secrets("default").Get(context.Background(), "db-secret", metav1.GetOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if string(s.Data["password"]) != "new" {
		t.Fatalf("expected password 'new', got %q", string(s.Data["password"]))
	}
}

func TestGetConfigMapYAMLRoundTrip(t *testing.T) {
	client := fake.NewSimpleClientset(
		&corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{Name: "app-config", Namespace: "default"},
			Data:       map[string]string{"KEY": "value"},
		},
	)
	yamlText, err := GetConfigMapYAML(context.Background(), client, "default", "app-config")
	if err != nil {
		t.Fatal(err)
	}
	// Mutate then re-apply the generated YAML.
	if err := DeleteConfigMap(context.Background(), client, "default", "app-config"); err != nil {
		t.Fatal(err)
	}
	if err := ApplyConfigMap(context.Background(), client, "default", "app-config", yamlText); err != nil {
		t.Fatal(err)
	}
	cm, err := client.CoreV1().ConfigMaps("default").Get(context.Background(), "app-config", metav1.GetOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if cm.Data["KEY"] != "value" {
		t.Fatalf("unexpected data after round trip: %v", cm.Data)
	}
}
