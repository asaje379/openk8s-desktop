package k8s

import (
	"context"
	"sort"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// ListNamespaces returns the namespaces of a cluster, sorted by name.
func ListNamespaces(ctx context.Context, client kubernetes.Interface) ([]NamespaceInfo, error) {
	list, err := client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	result := make([]NamespaceInfo, 0, len(list.Items))
	for _, ns := range list.Items {
		result = append(result, NamespaceInfo{
			Name:   ns.Name,
			Status: string(ns.Status.Phase),
			Age:    formatAge(ns.CreationTimestamp),
		})
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result, nil
}

// ListNodes returns the nodes of a cluster, sorted by name.
func ListNodes(ctx context.Context, client kubernetes.Interface) ([]NodeInfo, error) {
	list, err := client.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	result := make([]NodeInfo, 0, len(list.Items))
	for _, n := range list.Items {
		status := "NotReady"
		for _, cond := range n.Status.Conditions {
			if cond.Type == "Ready" && cond.Status == "True" {
				status = "Ready"
			}
		}

		roles := make([]string, 0)
		for k := range n.Labels {
			if strings.HasPrefix(k, "node-role.kubernetes.io/") {
				roles = append(roles, strings.TrimPrefix(k, "node-role.kubernetes.io/"))
			}
		}
		if len(roles) == 0 {
			roles = []string{"worker"}
		}
		sort.Strings(roles)

		result = append(result, NodeInfo{
			Name:    n.Name,
			Status:  status,
			Roles:   roles,
			Version: n.Status.NodeInfo.KubeletVersion,
			Age:     formatAge(n.CreationTimestamp),
		})
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result, nil
}
