package k8s

import (
	"context"
	"fmt"
	"sort"
	"strings"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	metricsclientset "k8s.io/metrics/pkg/client/clientset/versioned"
)

// NewMetricsClient builds a Metrics Server client (metrics.k8s.io) from a
// rest.Config.
func NewMetricsClient(restCfg *rest.Config) (metricsclientset.Interface, error) {
	return metricsclientset.NewForConfig(restCfg)
}

// formatCPUMillis renders a CPU quantity in millicores, e.g. "250m" or "1.5".
func formatCPUMillis(milli int64) string {
	if milli < 1000 {
		return fmt.Sprintf("%dm", milli)
	}
	return trimFloat(fmt.Sprintf("%.2f", float64(milli)/1000))
}

// formatBytes renders a memory quantity in bytes, e.g. "128 Mi" or "1.5 Gi".
func formatBytes(b int64) string {
	const (
		Ki = int64(1) << 10
		Mi = int64(1) << 20
		Gi = int64(1) << 30
		Ti = int64(1) << 40
	)
	switch {
	case b >= Ti:
		return trimFloat(fmt.Sprintf("%.2f", float64(b)/float64(Ti))) + " Ti"
	case b >= Gi:
		return trimFloat(fmt.Sprintf("%.2f", float64(b)/float64(Gi))) + " Gi"
	case b >= Mi:
		return trimFloat(fmt.Sprintf("%.1f", float64(b)/float64(Mi))) + " Mi"
	case b >= Ki:
		return trimFloat(fmt.Sprintf("%.1f", float64(b)/float64(Ki))) + " Ki"
	default:
		return fmt.Sprintf("%d B", b)
	}
}

func trimFloat(s string) string {
	return strings.TrimRight(strings.TrimRight(s, "0"), ".")
}

// ListNodeMetrics returns the CPU/memory usage of every node, compared to its
// allocatable capacity.
func ListNodeMetrics(ctx context.Context, client kubernetes.Interface, metricsClient metricsclientset.Interface) ([]NodeMetrics, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	list, err := metricsClient.MetricsV1beta1().NodeMetricses().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	nodes, err := client.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	allocatable := make(map[string]corev1.ResourceList, len(nodes.Items))
	for _, n := range nodes.Items {
		allocatable[n.Name] = n.Status.Allocatable
	}

	result := make([]NodeMetrics, 0, len(list.Items))
	for _, m := range list.Items {
		cpuUsed := m.Usage[corev1.ResourceCPU]
		memUsed := m.Usage[corev1.ResourceMemory]
		cpuTotal := allocatable[m.Name][corev1.ResourceCPU]
		memTotal := allocatable[m.Name][corev1.ResourceMemory]

		result = append(result, NodeMetrics{
			Name:             m.Name,
			CPUUsed:          formatCPUMillis(cpuUsed.MilliValue()),
			CPUTotal:         formatCPUMillis(cpuTotal.MilliValue()),
			MemoryUsed:       formatBytes(memUsed.Value()),
			MemoryTotal:      formatBytes(memTotal.Value()),
			CPUUsedMillis:    cpuUsed.MilliValue(),
			CPUTotalMillis:   cpuTotal.MilliValue(),
			MemoryUsedBytes:  memUsed.Value(),
			MemoryTotalBytes: memTotal.Value(),
		})
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result, nil
}

// ListPodMetrics returns the CPU/memory usage of every pod in a namespace,
// summed across its containers.
func ListPodMetrics(ctx context.Context, metricsClient metricsclientset.Interface, namespace string) ([]PodMetrics, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	list, err := metricsClient.MetricsV1beta1().PodMetricses(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	result := make([]PodMetrics, 0, len(list.Items))
	for _, p := range list.Items {
		var cpu, mem resource.Quantity
		for _, c := range p.Containers {
			cpu.Add(c.Usage[corev1.ResourceCPU])
			mem.Add(c.Usage[corev1.ResourceMemory])
		}
		result = append(result, PodMetrics{
			Name:      p.Name,
			Namespace: p.Namespace,
			CPU:       formatCPUMillis(cpu.MilliValue()),
			Memory:    formatBytes(mem.Value()),
		})
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result, nil
}

// GetClusterMetrics returns the aggregated CPU/memory usage of a cluster.
// When node metrics are inaccessible (e.g. forbidden at cluster scope), it
// falls back to aggregating pod metrics across the provided namespaces, in
// which case only "used" values are returned (no totals).
func GetClusterMetrics(ctx context.Context, client kubernetes.Interface, metricsClient metricsclientset.Interface, namespaces []string) (*ClusterMetrics, error) {
	nodes, err := ListNodeMetrics(ctx, client, metricsClient)
	if err == nil {
		var cpuUsed, cpuTotal, memUsed, memTotal int64
		for _, n := range nodes {
			cpuUsed += n.CPUUsedMillis
			cpuTotal += n.CPUTotalMillis
			memUsed += n.MemoryUsedBytes
			memTotal += n.MemoryTotalBytes
		}
		return &ClusterMetrics{
			CPUUsed:          formatCPUMillis(cpuUsed),
			CPUTotal:         formatCPUMillis(cpuTotal),
			MemoryUsed:       formatBytes(memUsed),
			MemoryTotal:      formatBytes(memTotal),
			CPUUsedMillis:    cpuUsed,
			CPUTotalMillis:   cpuTotal,
			MemoryUsedBytes:  memUsed,
			MemoryTotalBytes: memTotal,
			TotalsAvailable:  true,
		}, nil
	}

	// Node metrics unavailable → aggregate pod metrics across the namespaces
	// the user can access (used only, no totals).
	if len(namespaces) == 0 {
		return nil, err
	}
	cpuUsed, memUsed, podErr := clusterPodUsage(ctx, metricsClient, namespaces)
	if podErr != nil {
		return nil, err
	}
	return &ClusterMetrics{
		CPUUsed:         formatCPUMillis(cpuUsed),
		MemoryUsed:      formatBytes(memUsed),
		CPUUsedMillis:   cpuUsed,
		MemoryUsedBytes: memUsed,
		TotalsAvailable: false,
	}, nil
}

// clusterPodUsage sums CPU/memory usage of all pods across the namespaces.
func clusterPodUsage(ctx context.Context, metricsClient metricsclientset.Interface, namespaces []string) (cpuMillis int64, memBytes int64, err error) {
	for _, ns := range namespaces {
		ctx, cancel := withTimeout(ctx)
		list, listErr := metricsClient.MetricsV1beta1().PodMetricses(ns).List(ctx, metav1.ListOptions{})
		cancel()
		if listErr != nil {
			return 0, 0, listErr
		}
		for _, p := range list.Items {
			var cpu, mem resource.Quantity
			for _, c := range p.Containers {
				cpu.Add(c.Usage[corev1.ResourceCPU])
				mem.Add(c.Usage[corev1.ResourceMemory])
			}
			cpuMillis += cpu.MilliValue()
			memBytes += mem.Value()
		}
	}
	return cpuMillis, memBytes, nil
}
