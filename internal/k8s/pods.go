package k8s

import (
	"context"
	"fmt"
	"sort"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/yaml"
)

// podInfo builds a compact PodInfo from a pod.
func podInfo(p corev1.Pod) PodInfo {
	ready, total := 0, 0
	var restarts int32
	for _, c := range p.Status.ContainerStatuses {
		total++
		if c.Ready {
			ready++
		}
		restarts += c.RestartCount
	}
	return PodInfo{
		Name:      p.Name,
		Namespace: p.Namespace,
		Status:    string(p.Status.Phase),
		Ready:     fmt.Sprintf("%d/%d", ready, total),
		Restarts:  restarts,
		Node:      p.Spec.NodeName,
		IP:        p.Status.PodIP,
		Age:       formatAge(p.CreationTimestamp),
	}
}

// ListPods returns the pods of a cluster (optionally filtered by namespace).
func ListPods(ctx context.Context, client kubernetes.Interface, namespace string) ([]PodInfo, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	list, err := client.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	result := make([]PodInfo, 0, len(list.Items))
	for _, p := range list.Items {
		result = append(result, podInfo(p))
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result, nil
}

func containerState(s corev1.ContainerState) string {
	switch {
	case s.Running != nil:
		return "running"
	case s.Terminated != nil:
		return "terminated"
	case s.Waiting != nil:
		if s.Waiting.Reason != "" {
			return s.Waiting.Reason
		}
		return "waiting"
	default:
		return "unknown"
	}
}

// GetPod returns a compact detail view of a pod.
func GetPod(ctx context.Context, client kubernetes.Interface, namespace string, name string) (*PodDetail, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	p, err := client.CoreV1().Pods(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	detail := &PodDetail{
		Name:      p.Name,
		Namespace: p.Namespace,
		Status:    string(p.Status.Phase),
		Node:      p.Spec.NodeName,
		IP:        p.Status.PodIP,
		CreatedAt: p.CreationTimestamp.Time.UTC().Format(time.RFC3339),
		Labels:    p.Labels,
	}

	containers := make([]ContainerInfo, 0, len(p.Status.ContainerStatuses))
	for _, cs := range p.Status.ContainerStatuses {
		containers = append(containers, ContainerInfo{
			Name:         cs.Name,
			Image:        cs.Image,
			Ready:        cs.Ready,
			RestartCount: cs.RestartCount,
			State:        containerState(cs.State),
		})
		detail.Restarts += cs.RestartCount
	}
	detail.Containers = containers
	return detail, nil
}

// GetPodYAML returns the pod serialized as YAML.
func GetPodYAML(ctx context.Context, client kubernetes.Interface, namespace string, name string) (string, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	p, err := client.CoreV1().Pods(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return "", err
	}
	p.ManagedFields = nil
	data, err := yaml.Marshal(p)
	if err != nil {
		return "", err
	}
	return string(data), nil
}
