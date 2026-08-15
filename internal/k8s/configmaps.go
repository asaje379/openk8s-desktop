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

// ListConfigMaps returns configmaps in a namespace.
func ListConfigMaps(ctx context.Context, client kubernetes.Interface, namespace string) ([]ConfigMapInfo, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	list, err := client.CoreV1().ConfigMaps(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	result := make([]ConfigMapInfo, 0, len(list.Items))
	for _, cm := range list.Items {
		result = append(result, ConfigMapInfo{
			Name:      cm.Name,
			Namespace: cm.Namespace,
			Keys:      sortedStringKeys(cm.Data),
			Age:       formatAge(cm.CreationTimestamp),
		})
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result, nil
}

// GetConfigMap returns the detail of a configmap.
func GetConfigMap(ctx context.Context, client kubernetes.Interface, namespace string, name string) (*ConfigMapDetail, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	cm, err := client.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}
	return &ConfigMapDetail{
		Name:      cm.Name,
		Namespace: cm.Namespace,
		Data:      cm.Data,
		Age:       formatAge(cm.CreationTimestamp),
	}, nil
}

// GetConfigMapYAML returns a ConfigMap serialized as YAML.
func GetConfigMapYAML(ctx context.Context, client kubernetes.Interface, namespace string, name string) (string, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	cm, err := client.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", err
	}
	cm.ManagedFields = nil
	data, err := yaml.Marshal(cm)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// ApplyConfigMap creates or updates a ConfigMap from a YAML manifest.
func ApplyConfigMap(ctx context.Context, client kubernetes.Interface, namespace string, name string, yamlText string) error {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	var cm corev1.ConfigMap
	if err := yaml.Unmarshal([]byte(yamlText), &cm); err != nil {
		return fmt.Errorf("invalid YAML: %w", err)
	}
	cm.Namespace = namespace
	cm.Name = name

	existing, err := client.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	switch {
	case err == nil:
		cm.ResourceVersion = existing.ResourceVersion
		_, err = client.CoreV1().ConfigMaps(namespace).Update(ctx, &cm, metav1.UpdateOptions{})
		return err
	case apierrors.IsNotFound(err):
		_, err = client.CoreV1().ConfigMaps(namespace).Create(ctx, &cm, metav1.CreateOptions{})
		return err
	default:
		return err
	}
}

// DeleteConfigMap deletes a configmap.
func DeleteConfigMap(ctx context.Context, client kubernetes.Interface, namespace string, name string) error {
	ctx, cancel := withTimeout(ctx)
	defer cancel()
	return client.CoreV1().ConfigMaps(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

func sortedStringKeys(m map[string]string) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}
