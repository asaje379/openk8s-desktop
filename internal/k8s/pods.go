package k8s

import (
	"context"
	"fmt"
	"sort"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// ListPods returns the pods of a cluster (optionally filtered by namespace).
func ListPods(ctx context.Context, client kubernetes.Interface, namespace string) ([]PodInfo, error) {
	list, err := client.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	result := make([]PodInfo, 0, len(list.Items))
	for _, p := range list.Items {
		ready, total := 0, 0
		var restarts int32
		for _, c := range p.Status.ContainerStatuses {
			total++
			if c.Ready {
				ready++
			}
			restarts += c.RestartCount
		}
		result = append(result, PodInfo{
			Name:      p.Name,
			Namespace: p.Namespace,
			Status:    string(p.Status.Phase),
			Ready:     fmt.Sprintf("%d/%d", ready, total),
			Restarts:  restarts,
			Node:      p.Spec.NodeName,
			IP:        p.Status.PodIP,
			Age:       formatAge(p.CreationTimestamp),
		})
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result, nil
}
