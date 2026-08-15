package k8s

import (
	"context"
	"fmt"
	"sort"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/yaml"
)

// ListSecrets returns secrets in a namespace (values never exposed here).
func ListSecrets(ctx context.Context, client kubernetes.Interface, namespace string) ([]SecretInfo, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	list, err := client.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	result := make([]SecretInfo, 0, len(list.Items))
	for _, s := range list.Items {
		result = append(result, SecretInfo{
			Name:      s.Name,
			Namespace: s.Namespace,
			Type:      string(s.Type),
			Keys:      sortedByteKeys(s.Data),
			Age:       formatAge(s.CreationTimestamp),
		})
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result, nil
}

// GetSecret returns the detail of a secret.
func GetSecret(ctx context.Context, client kubernetes.Interface, namespace string, name string) (*SecretDetail, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	s, err := client.CoreV1().Secrets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	data := make(map[string]string, len(s.Data))
	for k, v := range s.Data {
		data[k] = string(v)
	}

	return &SecretDetail{
		Name:      s.Name,
		Namespace: s.Namespace,
		Type:      string(s.Type),
		Data:      data,
		Age:       formatAge(s.CreationTimestamp),
	}, nil
}

// GetSecretYAML returns a Secret serialized as YAML (data values remain
// base64-encoded as in the manifest).
func GetSecretYAML(ctx context.Context, client kubernetes.Interface, namespace string, name string) (string, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	s, err := client.CoreV1().Secrets(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", err
	}
	s.ManagedFields = nil
	data, err := yaml.Marshal(s)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// ApplySecret creates or updates a Secret from a YAML manifest.
func ApplySecret(ctx context.Context, client kubernetes.Interface, namespace string, name string, yamlText string) error {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	var s corev1.Secret
	if err := yaml.Unmarshal([]byte(yamlText), &s); err != nil {
		return fmt.Errorf("invalid YAML: %w", err)
	}
	s.Namespace = namespace
	s.Name = name

	existing, err := client.CoreV1().Secrets(namespace).Get(ctx, name, metav1.GetOptions{})
	switch {
	case err == nil:
		s.ResourceVersion = existing.ResourceVersion
		_, err = client.CoreV1().Secrets(namespace).Update(ctx, &s, metav1.UpdateOptions{})
		return err
	case apierrors.IsNotFound(err):
		_, err = client.CoreV1().Secrets(namespace).Create(ctx, &s, metav1.CreateOptions{})
		return err
	default:
		return err
	}
}

// DeleteSecret deletes a secret.
func DeleteSecret(ctx context.Context, client kubernetes.Interface, namespace string, name string) error {
	ctx, cancel := withTimeout(ctx)
	defer cancel()
	return client.CoreV1().Secrets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

func sortedByteKeys(m map[string][]byte) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}
