package watch

import (
	"context"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/kubernetes"

	"openk8s-desktop/internal/k8s"
)

type listFunc func(ctx context.Context, client kubernetes.Interface, namespace string) (any, error)
type watchFunc func(ctx context.Context, client kubernetes.Interface, namespace string) (watch.Interface, error)

type source struct {
	clusterScoped bool
	list          listFunc
	watch         watchFunc
}

// sources returns the registered watchable resources. Resource names must
// match the frontend query-key segments (see WatchProvider).
func sources() map[string]source {
	return map[string]source{
		"namespaces": {
			clusterScoped: true,
			list: func(ctx context.Context, c kubernetes.Interface, _ string) (any, error) {
				return k8s.ListNamespaces(ctx, c)
			},
			watch: func(ctx context.Context, c kubernetes.Interface, _ string) (watch.Interface, error) {
				return c.CoreV1().Namespaces().Watch(ctx, metav1.ListOptions{})
			},
		},
		"nodes": {
			clusterScoped: true,
			list: func(ctx context.Context, c kubernetes.Interface, _ string) (any, error) {
				return k8s.ListNodes(ctx, c)
			},
			watch: func(ctx context.Context, c kubernetes.Interface, _ string) (watch.Interface, error) {
				return c.CoreV1().Nodes().Watch(ctx, metav1.ListOptions{})
			},
		},
		"pods": {
			list: func(ctx context.Context, c kubernetes.Interface, ns string) (any, error) {
				return k8s.ListPods(ctx, c, ns)
			},
			watch: func(ctx context.Context, c kubernetes.Interface, ns string) (watch.Interface, error) {
				return c.CoreV1().Pods(ns).Watch(ctx, metav1.ListOptions{})
			},
		},
		"deployments": {
			list: func(ctx context.Context, c kubernetes.Interface, ns string) (any, error) {
				return k8s.ListDeployments(ctx, c, ns)
			},
			watch: func(ctx context.Context, c kubernetes.Interface, ns string) (watch.Interface, error) {
				return c.AppsV1().Deployments(ns).Watch(ctx, metav1.ListOptions{})
			},
		},
		"statefulsets": {
			list: func(ctx context.Context, c kubernetes.Interface, ns string) (any, error) {
				return k8s.ListStatefulSets(ctx, c, ns)
			},
			watch: func(ctx context.Context, c kubernetes.Interface, ns string) (watch.Interface, error) {
				return c.AppsV1().StatefulSets(ns).Watch(ctx, metav1.ListOptions{})
			},
		},
		"daemonsets": {
			list: func(ctx context.Context, c kubernetes.Interface, ns string) (any, error) {
				return k8s.ListDaemonSets(ctx, c, ns)
			},
			watch: func(ctx context.Context, c kubernetes.Interface, ns string) (watch.Interface, error) {
				return c.AppsV1().DaemonSets(ns).Watch(ctx, metav1.ListOptions{})
			},
		},
		"jobs": {
			list: func(ctx context.Context, c kubernetes.Interface, ns string) (any, error) {
				return k8s.ListJobs(ctx, c, ns)
			},
			watch: func(ctx context.Context, c kubernetes.Interface, ns string) (watch.Interface, error) {
				return c.BatchV1().Jobs(ns).Watch(ctx, metav1.ListOptions{})
			},
		},
		"cronjobs": {
			list: func(ctx context.Context, c kubernetes.Interface, ns string) (any, error) {
				return k8s.ListCronJobs(ctx, c, ns)
			},
			watch: func(ctx context.Context, c kubernetes.Interface, ns string) (watch.Interface, error) {
				return c.BatchV1().CronJobs(ns).Watch(ctx, metav1.ListOptions{})
			},
		},
		"services": {
			list: func(ctx context.Context, c kubernetes.Interface, ns string) (any, error) {
				return k8s.ListServices(ctx, c, ns)
			},
			watch: func(ctx context.Context, c kubernetes.Interface, ns string) (watch.Interface, error) {
				return c.CoreV1().Services(ns).Watch(ctx, metav1.ListOptions{})
			},
		},
		"ingresses": {
			list: func(ctx context.Context, c kubernetes.Interface, ns string) (any, error) {
				return k8s.ListIngresses(ctx, c, ns)
			},
			watch: func(ctx context.Context, c kubernetes.Interface, ns string) (watch.Interface, error) {
				return c.NetworkingV1().Ingresses(ns).Watch(ctx, metav1.ListOptions{})
			},
		},
		"configmaps": {
			list: func(ctx context.Context, c kubernetes.Interface, ns string) (any, error) {
				return k8s.ListConfigMaps(ctx, c, ns)
			},
			watch: func(ctx context.Context, c kubernetes.Interface, ns string) (watch.Interface, error) {
				return c.CoreV1().ConfigMaps(ns).Watch(ctx, metav1.ListOptions{})
			},
		},
		"secrets": {
			list: func(ctx context.Context, c kubernetes.Interface, ns string) (any, error) {
				return k8s.ListSecrets(ctx, c, ns)
			},
			watch: func(ctx context.Context, c kubernetes.Interface, ns string) (watch.Interface, error) {
				return c.CoreV1().Secrets(ns).Watch(ctx, metav1.ListOptions{})
			},
		},
		"events": {
			list: func(ctx context.Context, c kubernetes.Interface, ns string) (any, error) {
				return k8s.ListEvents(ctx, c, ns)
			},
			watch: func(ctx context.Context, c kubernetes.Interface, ns string) (watch.Interface, error) {
				return c.CoreV1().Events(ns).Watch(ctx, metav1.ListOptions{})
			},
		},
	}
}
