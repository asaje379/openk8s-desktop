package k8s

import (
	"fmt"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// NamespaceInfo is a compact view of a namespace.
type NamespaceInfo struct {
	Name   string `json:"name"`
	Status string `json:"status"`
	Age    string `json:"age"`
}

// NodeInfo is a compact view of a node.
type NodeInfo struct {
	Name    string   `json:"name"`
	Status  string   `json:"status"`
	Roles   []string `json:"roles"`
	Version string   `json:"version"`
	Age     string   `json:"age"`
}

// PodInfo is a compact view of a pod.
type PodInfo struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Status    string `json:"status"`
	Ready     string `json:"ready"`
	Restarts  int32  `json:"restarts"`
	Node      string `json:"node"`
	IP        string `json:"ip"`
	Age       string `json:"age"`
}

// WorkloadInfo is a compact view of a Deployment/StatefulSet/DaemonSet.
type WorkloadInfo struct {
	Kind      string `json:"kind"`
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Desired   int32  `json:"desired"`
	Ready     int32  `json:"ready"`
	Available int32  `json:"available"`
	Image     string `json:"image"`
	Age       string `json:"age"`
}

// JobInfo is a compact view of a Job.
type JobInfo struct {
	Name        string `json:"name"`
	Namespace   string `json:"namespace"`
	Completions string `json:"completions"`
	Duration    string `json:"duration"`
	Age         string `json:"age"`
}

// CronJobInfo is a compact view of a CronJob.
type CronJobInfo struct {
	Name         string `json:"name"`
	Namespace    string `json:"namespace"`
	Schedule     string `json:"schedule"`
	Suspend      bool   `json:"suspend"`
	Active       int    `json:"active"`
	LastSchedule string `json:"lastSchedule"`
	Age          string `json:"age"`
}

// ServiceInfo is a compact view of a Service.
type ServiceInfo struct {
	Name       string `json:"name"`
	Namespace  string `json:"namespace"`
	Type       string `json:"type"`
	ClusterIP  string `json:"clusterIP"`
	ExternalIP string `json:"externalIP"`
	Ports      string `json:"ports"`
	Age        string `json:"age"`
}

// IngressInfo is a compact view of an Ingress.
type IngressInfo struct {
	Name      string   `json:"name"`
	Namespace string   `json:"namespace"`
	Class     string   `json:"class"`
	Hosts     []string `json:"hosts"`
	Addresses []string `json:"addresses"`
	Age       string   `json:"age"`
}

// ConfigMapInfo is a compact view of a ConfigMap.
type ConfigMapInfo struct {
	Name      string   `json:"name"`
	Namespace string   `json:"namespace"`
	Keys      []string `json:"keys"`
	Age       string   `json:"age"`
}

// ConfigMapDetail is a ConfigMap with its data entries.
type ConfigMapDetail struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Data      map[string]string `json:"data"`
	Age       string            `json:"age"`
}

// SecretInfo is a compact view of a Secret (values never exposed here).
type SecretInfo struct {
	Name      string   `json:"name"`
	Namespace string   `json:"namespace"`
	Type      string   `json:"type"`
	Keys      []string `json:"keys"`
	Age       string   `json:"age"`
}

// SecretDetail is a Secret with its data entries. Values are masked by the
// frontend until explicitly revealed.
type SecretDetail struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace"`
	Type      string            `json:"type"`
	Data      map[string]string `json:"data"`
	Age       string            `json:"age"`
}

// ContainerInfo is a compact view of a container within a pod.
type ContainerInfo struct {
	Name         string `json:"name"`
	Image        string `json:"image"`
	Ready        bool   `json:"ready"`
	RestartCount int32  `json:"restartCount"`
	State        string `json:"state"`
}

// PodDetail is a compact view of a pod for the detail page.
type PodDetail struct {
	Name       string            `json:"name"`
	Namespace  string            `json:"namespace"`
	Status     string            `json:"status"`
	Node       string            `json:"node"`
	IP         string            `json:"ip"`
	CreatedAt  string            `json:"createdAt"`
	Restarts   int32             `json:"restarts"`
	Labels     map[string]string `json:"labels"`
	Containers []ContainerInfo   `json:"containers"`
}

// EventInfo is a compact view of a Kubernetes event.
type EventInfo struct {
	Type      string `json:"type"`
	Reason    string `json:"reason"`
	Message   string `json:"message"`
	Object    string `json:"object"`
	Kind      string `json:"kind"`
	Namespace string `json:"namespace"`
	Count     int32  `json:"count"`
	Age       string `json:"age"`
}

// SearchResult is a single match from a global search.
type SearchResult struct {
	Kind      string `json:"kind"`
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

// DeploymentDetail is a compact view of a Deployment for the detail page.
type DeploymentDetail struct {
	Name       string            `json:"name"`
	Namespace  string            `json:"namespace"`
	Desired    int32             `json:"desired"`
	Ready      int32             `json:"ready"`
	Available  int32             `json:"available"`
	Image      string            `json:"image"`
	Selector   map[string]string `json:"selector"`
	Containers []string          `json:"containers"`
	Age        string            `json:"age"`
}

// NodeMetrics is the CPU/memory usage of a single node (used vs allocatable).
type NodeMetrics struct {
	Name             string `json:"name"`
	CPUUsed          string `json:"cpuUsed"`
	CPUTotal         string `json:"cpuTotal"`
	MemoryUsed       string `json:"memoryUsed"`
	MemoryTotal      string `json:"memoryTotal"`
	CPUUsedMillis    int64  `json:"cpuUsedMillis"`
	CPUTotalMillis   int64  `json:"cpuTotalMillis"`
	MemoryUsedBytes  int64  `json:"memoryUsedBytes"`
	MemoryTotalBytes int64  `json:"memoryTotalBytes"`
}

// PodMetrics is the CPU/memory usage of a single pod.
type PodMetrics struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	CPU       string `json:"cpu"`
	Memory    string `json:"memory"`
}

// ClusterMetrics is the aggregated CPU/memory usage across all nodes.
type ClusterMetrics struct {
	CPUUsed          string `json:"cpuUsed"`
	CPUTotal         string `json:"cpuTotal"`
	MemoryUsed       string `json:"memoryUsed"`
	MemoryTotal      string `json:"memoryTotal"`
	CPUUsedMillis    int64  `json:"cpuUsedMillis"`
	CPUTotalMillis   int64  `json:"cpuTotalMillis"`
	MemoryUsedBytes  int64  `json:"memoryUsedBytes"`
	MemoryTotalBytes int64  `json:"memoryTotalBytes"`
	// TotalsAvailable is false when only "used" values could be computed
	// (e.g. node metrics are forbidden at cluster scope, so pod metrics
	// across accessible namespaces were used instead).
	TotalsAvailable bool `json:"totalsAvailable"`
}

// formatAge returns a human-readable duration since the given timestamp.
func formatAge(t metav1.Time) string {
	d := time.Since(t.Time)
	switch {
	case d >= 24*time.Hour:
		return fmt.Sprintf("%dd", int(d.Hours()/24))
	case d >= time.Hour:
		return fmt.Sprintf("%dh", int(d.Hours()))
	case d >= time.Minute:
		return fmt.Sprintf("%dm", int(d.Minutes()))
	default:
		return fmt.Sprintf("%ds", int(d.Seconds()))
	}
}
