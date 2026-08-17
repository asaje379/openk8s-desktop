package k8s

import (
	"context"
	"sort"
	"strings"

	"k8s.io/client-go/kubernetes"
)

const maxSearchResults = 50

// firstList returns the result of listing across all namespaces, falling back
// to the given namespace when the cluster-scoped listing is forbidden (RBAC).
func firstList[T any](allNs func(string) ([]T, error), scoped func(string) ([]T, error), namespace string) ([]T, error) {
	if items, err := allNs(""); err == nil {
		return items, nil
	}
	return scoped(namespace)
}

// SearchResources returns resources whose name matches the query
// (case-insensitive substring). Namespaced resources are searched across ALL
// namespaces by default so results are not limited to the active namespace;
// when the identity cannot list cluster-wide (RBAC), it falls back to the
// given namespace. Nodes and namespaces are cluster-scoped. Resources that
// cannot be listed are skipped. Results are de-duplicated and sorted by kind
// then name.
func SearchResources(ctx context.Context, client kubernetes.Interface, namespace string, query string) ([]SearchResult, error) {
	query = strings.ToLower(strings.TrimSpace(query))
	if query == "" {
		return make([]SearchResult, 0), nil
	}

	contains := func(s string) bool { return strings.Contains(strings.ToLower(s), query) }
	results := make([]SearchResult, 0, 64)
	seen := make(map[string]bool, 64)

	add := func(r SearchResult) {
		key := r.Kind + "/" + r.Namespace + "/" + r.Name
		if seen[key] {
			return
		}
		seen[key] = true
		results = append(results, r)
	}

	listPods := func(ns string) ([]PodInfo, error) { return ListPods(ctx, client, ns) }
	if pods, err := firstList(listPods, listPods, namespace); err == nil {
		for _, p := range pods {
			if contains(p.Name) {
				add(SearchResult{Kind: "Pod", Name: p.Name, Namespace: p.Namespace})
			}
		}
	}
	listDeployments := func(ns string) ([]WorkloadInfo, error) { return ListDeployments(ctx, client, ns) }
	if deployments, err := firstList(listDeployments, listDeployments, namespace); err == nil {
		for _, d := range deployments {
			if contains(d.Name) {
				add(SearchResult{Kind: "Deployment", Name: d.Name, Namespace: d.Namespace})
			}
		}
	}
	listStatefulSets := func(ns string) ([]WorkloadInfo, error) { return ListStatefulSets(ctx, client, ns) }
	if statefulsets, err := firstList(listStatefulSets, listStatefulSets, namespace); err == nil {
		for _, s := range statefulsets {
			if contains(s.Name) {
				add(SearchResult{Kind: "StatefulSet", Name: s.Name, Namespace: s.Namespace})
			}
		}
	}
	listDaemonSets := func(ns string) ([]WorkloadInfo, error) { return ListDaemonSets(ctx, client, ns) }
	if daemonsets, err := firstList(listDaemonSets, listDaemonSets, namespace); err == nil {
		for _, d := range daemonsets {
			if contains(d.Name) {
				add(SearchResult{Kind: "DaemonSet", Name: d.Name, Namespace: d.Namespace})
			}
		}
	}
	listServices := func(ns string) ([]ServiceInfo, error) { return ListServices(ctx, client, ns) }
	if services, err := firstList(listServices, listServices, namespace); err == nil {
		for _, s := range services {
			if contains(s.Name) {
				add(SearchResult{Kind: "Service", Name: s.Name, Namespace: s.Namespace})
			}
		}
	}
	listIngresses := func(ns string) ([]IngressInfo, error) { return ListIngresses(ctx, client, ns) }
	if ingresses, err := firstList(listIngresses, listIngresses, namespace); err == nil {
		for _, i := range ingresses {
			if contains(i.Name) {
				add(SearchResult{Kind: "Ingress", Name: i.Name, Namespace: i.Namespace})
			}
		}
	}
	listConfigMaps := func(ns string) ([]ConfigMapInfo, error) { return ListConfigMaps(ctx, client, ns) }
	if configmaps, err := firstList(listConfigMaps, listConfigMaps, namespace); err == nil {
		for _, cm := range configmaps {
			if contains(cm.Name) {
				add(SearchResult{Kind: "ConfigMap", Name: cm.Name, Namespace: cm.Namespace})
			}
		}
	}
	listSecrets := func(ns string) ([]SecretInfo, error) { return ListSecrets(ctx, client, ns) }
	if secrets, err := firstList(listSecrets, listSecrets, namespace); err == nil {
		for _, s := range secrets {
			if contains(s.Name) {
				add(SearchResult{Kind: "Secret", Name: s.Name, Namespace: s.Namespace})
			}
		}
	}
	if nodes, err := ListNodes(ctx, client); err == nil {
		for _, n := range nodes {
			if contains(n.Name) {
				add(SearchResult{Kind: "Node", Name: n.Name})
			}
		}
	}
	if namespaces, err := ListNamespaces(ctx, client); err == nil {
		for _, ns := range namespaces {
			if contains(ns.Name) {
				add(SearchResult{Kind: "Namespace", Name: ns.Name})
			}
		}
	}

	sort.Slice(results, func(i, j int) bool {
		if results[i].Kind != results[j].Kind {
			return results[i].Kind < results[j].Kind
		}
		return results[i].Name < results[j].Name
	})
	if len(results) > maxSearchResults {
		results = results[:maxSearchResults]
	}
	return results, nil
}