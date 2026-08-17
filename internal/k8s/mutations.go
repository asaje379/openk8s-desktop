package k8s

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/yaml"
)

// restartAnnotation is a strategic merge patch that bumps the
// kubectl.kubernetes.io/restartedAt annotation on the pod template, triggering
// a rolling restart. It applies to Deployment, StatefulSet and DaemonSet (they
// all expose spec.template.metadata.annotations).
func restartPatch() ([]byte, error) {
	restartedAt := time.Now().UTC().Format(time.RFC3339)
	return json.Marshal(map[string]any{
		"spec": map[string]any{
			"template": map[string]any{
				"metadata": map[string]any{
					"annotations": map[string]any{
						"kubectl.kubernetes.io/restartedAt": restartedAt,
					},
				},
			},
		},
	})
}

// applyOrCreate updates an existing object (preserving its resourceVersion) or
// creates it when it does not exist yet. name and namespace are forced from the
// caller so a mismatched manifest cannot target a different resource.
func applyOrCreate(ctx context.Context, get func() (metav1.Object, error), create func(metav1.Object) error, update func(metav1.Object, string) error, obj metav1.Object, namespace string, name string) error {
	obj.SetNamespace(namespace)
	obj.SetName(name)

	existing, err := get()
	switch {
	case err == nil:
		obj.SetResourceVersion(existing.GetResourceVersion())
		return update(obj, existing.GetResourceVersion())
	case apierrors.IsNotFound(err):
		return create(obj)
	default:
		return err
	}
}

// --- Pods ---

// DeletePod deletes a pod.
func DeletePod(ctx context.Context, client kubernetes.Interface, namespace string, name string) error {
	ctx, cancel := withTimeout(ctx)
	defer cancel()
	return client.CoreV1().Pods(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

// ApplyPod creates or updates a pod from a YAML manifest.
func ApplyPod(ctx context.Context, client kubernetes.Interface, namespace string, name string, yamlText string) error {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	var pod corev1.Pod
	if err := yaml.Unmarshal([]byte(yamlText), &pod); err != nil {
		return fmt.Errorf("invalid YAML: %w", err)
	}
	return applyOrCreate(
		ctx,
		func() (metav1.Object, error) { return client.CoreV1().Pods(namespace).Get(ctx, name, metav1.GetOptions{}) },
		func(o metav1.Object) error {
			_, err := client.CoreV1().Pods(namespace).Create(ctx, o.(*corev1.Pod), metav1.CreateOptions{})
			return err
		},
		func(o metav1.Object, _ string) error {
			_, err := client.CoreV1().Pods(namespace).Update(ctx, o.(*corev1.Pod), metav1.UpdateOptions{})
			return err
		},
		&pod, namespace, name,
	)
}

// --- Deployments ---

// DeleteDeployment deletes a deployment.
func DeleteDeployment(ctx context.Context, client kubernetes.Interface, namespace string, name string) error {
	ctx, cancel := withTimeout(ctx)
	defer cancel()
	return client.AppsV1().Deployments(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

// ApplyDeployment creates or updates a deployment from a YAML manifest.
func ApplyDeployment(ctx context.Context, client kubernetes.Interface, namespace string, name string, yamlText string) error {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	var d appsv1.Deployment
	if err := yaml.Unmarshal([]byte(yamlText), &d); err != nil {
		return fmt.Errorf("invalid YAML: %w", err)
	}
	return applyOrCreate(
		ctx,
		func() (metav1.Object, error) { return client.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{}) },
		func(o metav1.Object) error {
			_, err := client.AppsV1().Deployments(namespace).Create(ctx, o.(*appsv1.Deployment), metav1.CreateOptions{})
			return err
		},
		func(o metav1.Object, _ string) error {
			_, err := client.AppsV1().Deployments(namespace).Update(ctx, o.(*appsv1.Deployment), metav1.UpdateOptions{})
			return err
		},
		&d, namespace, name,
	)
}

// RestartDeployment triggers a rolling restart of a deployment.
func RestartDeployment(ctx context.Context, client kubernetes.Interface, namespace string, name string) error {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	patch, err := restartPatch()
	if err != nil {
		return err
	}
	_, err = client.AppsV1().Deployments(namespace).Patch(ctx, name, types.StrategicMergePatchType, patch, metav1.PatchOptions{})
	return err
}

// --- StatefulSets ---

// DeleteStatefulSet deletes a statefulset.
func DeleteStatefulSet(ctx context.Context, client kubernetes.Interface, namespace string, name string) error {
	ctx, cancel := withTimeout(ctx)
	defer cancel()
	return client.AppsV1().StatefulSets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

// ApplyStatefulSet creates or updates a statefulset from a YAML manifest.
func ApplyStatefulSet(ctx context.Context, client kubernetes.Interface, namespace string, name string, yamlText string) error {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	var s appsv1.StatefulSet
	if err := yaml.Unmarshal([]byte(yamlText), &s); err != nil {
		return fmt.Errorf("invalid YAML: %w", err)
	}
	return applyOrCreate(
		ctx,
		func() (metav1.Object, error) { return client.AppsV1().StatefulSets(namespace).Get(ctx, name, metav1.GetOptions{}) },
		func(o metav1.Object) error {
			_, err := client.AppsV1().StatefulSets(namespace).Create(ctx, o.(*appsv1.StatefulSet), metav1.CreateOptions{})
			return err
		},
		func(o metav1.Object, _ string) error {
			_, err := client.AppsV1().StatefulSets(namespace).Update(ctx, o.(*appsv1.StatefulSet), metav1.UpdateOptions{})
			return err
		},
		&s, namespace, name,
	)
}

// RestartStatefulSet triggers a rolling restart of a statefulset.
func RestartStatefulSet(ctx context.Context, client kubernetes.Interface, namespace string, name string) error {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	patch, err := restartPatch()
	if err != nil {
		return err
	}
	_, err = client.AppsV1().StatefulSets(namespace).Patch(ctx, name, types.StrategicMergePatchType, patch, metav1.PatchOptions{})
	return err
}

// --- DaemonSets ---

// DeleteDaemonSet deletes a daemonset.
func DeleteDaemonSet(ctx context.Context, client kubernetes.Interface, namespace string, name string) error {
	ctx, cancel := withTimeout(ctx)
	defer cancel()
	return client.AppsV1().DaemonSets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

// ApplyDaemonSet creates or updates a daemonset from a YAML manifest.
func ApplyDaemonSet(ctx context.Context, client kubernetes.Interface, namespace string, name string, yamlText string) error {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	var d appsv1.DaemonSet
	if err := yaml.Unmarshal([]byte(yamlText), &d); err != nil {
		return fmt.Errorf("invalid YAML: %w", err)
	}
	return applyOrCreate(
		ctx,
		func() (metav1.Object, error) { return client.AppsV1().DaemonSets(namespace).Get(ctx, name, metav1.GetOptions{}) },
		func(o metav1.Object) error {
			_, err := client.AppsV1().DaemonSets(namespace).Create(ctx, o.(*appsv1.DaemonSet), metav1.CreateOptions{})
			return err
		},
		func(o metav1.Object, _ string) error {
			_, err := client.AppsV1().DaemonSets(namespace).Update(ctx, o.(*appsv1.DaemonSet), metav1.UpdateOptions{})
			return err
		},
		&d, namespace, name,
	)
}

// RestartDaemonSet triggers a rolling restart of a daemonset.
func RestartDaemonSet(ctx context.Context, client kubernetes.Interface, namespace string, name string) error {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	patch, err := restartPatch()
	if err != nil {
		return err
	}
	_, err = client.AppsV1().DaemonSets(namespace).Patch(ctx, name, types.StrategicMergePatchType, patch, metav1.PatchOptions{})
	return err
}