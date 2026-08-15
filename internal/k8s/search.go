package k8s

import (
	"context"
	"strings"

	"k8s.io/client-go/kubernetes"
)

const maxSearchResults = 50

// SearchResources returns resources whose name matches the query
// (case-insensitive substring). It searches the given namespace (pods,
// workloads, services, ingresses, configmaps, secrets) plus cluster-scoped
// nodes and namespaces. Resources that cannot be listed (RBAC) are skipped.
func SearchResources(ctx context.Context, client kubernetes.Interface, namespace string, query string) ([]SearchResult, error) {
	query = strings.ToLower(strings.TrimSpace(query))
	if len(query) < 2 {
		return make([]SearchResult, 0), nil
	}

	contains := func(s string) bool { return strings.Contains(strings.ToLower(s), query) }
	results := make([]SearchResult, 0, 64)

	if pods, err := ListPods(ctx, client, namespace); err == nil {
		for _, p := range pods {
			if contains(p.Name) {
				results = append(results, SearchResult{Kind: "Pod", Name: p.Name, Namespace: p.Namespace})
			}
		}
	}
	if deployments, err := ListDeployments(ctx, client, namespace); err == nil {
		for _, d := range deployments {
			if contains(d.Name) {
				results = append(results, SearchResult{Kind: "Deployment", Name: d.Name, Namespace: d.Namespace})
			}
		}
	}
	if statefulsets, err := ListStatefulSets(ctx, client, namespace); err == nil {
		for _, s := range statefulsets {
			if contains(s.Name) {
				results = append(results, SearchResult{Kind: "StatefulSet", Name: s.Name, Namespace: s.Namespace})
			}
		}
	}
	if daemonsets, err := ListDaemonSets(ctx, client, namespace); err == nil {
		for _, d := range daemonsets {
			if contains(d.Name) {
				results = append(results, SearchResult{Kind: "DaemonSet", Name: d.Name, Namespace: d.Namespace})
			}
		}
	}
	if services, err := ListServices(ctx, client, namespace); err == nil {
		for _, s := range services {
			if contains(s.Name) {
				results = append(results, SearchResult{Kind: "Service", Name: s.Name, Namespace: s.Namespace})
			}
		}
	}
	if ingresses, err := ListIngresses(ctx, client, namespace); err == nil {
		for _, i := range ingresses {
			if contains(i.Name) {
				results = append(results, SearchResult{Kind: "Ingress", Name: i.Name, Namespace: i.Namespace})
			}
		}
	}
	if configmaps, err := ListConfigMaps(ctx, client, namespace); err == nil {
		for _, cm := range configmaps {
			if contains(cm.Name) {
				results = append(results, SearchResult{Kind: "ConfigMap", Name: cm.Name, Namespace: cm.Namespace})
			}
		}
	}
	if secrets, err := ListSecrets(ctx, client, namespace); err == nil {
		for _, s := range secrets {
			if contains(s.Name) {
				results = append(results, SearchResult{Kind: "Secret", Name: s.Name, Namespace: s.Namespace})
			}
		}
	}
	if nodes, err := ListNodes(ctx, client); err == nil {
		for _, n := range nodes {
			if contains(n.Name) {
				results = append(results, SearchResult{Kind: "Node", Name: n.Name})
			}
		}
	}
	if namespaces, err := ListNamespaces(ctx, client); err == nil {
		for _, ns := range namespaces {
			if contains(ns.Name) {
				results = append(results, SearchResult{Kind: "Namespace", Name: ns.Name})
			}
		}
	}

	if len(results) > maxSearchResults {
		results = results[:maxSearchResults]
	}
	return results, nil
}
