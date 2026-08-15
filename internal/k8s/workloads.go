package k8s

import (
	"context"
	"fmt"
	"sort"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

func firstImage(containers []corev1.Container) string {
	if len(containers) > 0 {
		return containers[0].Image
	}
	return ""
}

func sortWorkloads(result []WorkloadInfo) {
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
}

// ListDeployments returns deployments in a namespace.
func ListDeployments(ctx context.Context, client kubernetes.Interface, namespace string) ([]WorkloadInfo, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	list, err := client.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	result := make([]WorkloadInfo, 0, len(list.Items))
	for _, d := range list.Items {
		desired := int32(0)
		if d.Spec.Replicas != nil {
			desired = *d.Spec.Replicas
		}
		result = append(result, WorkloadInfo{
			Kind:      "Deployment",
			Name:      d.Name,
			Namespace: d.Namespace,
			Desired:   desired,
			Ready:     d.Status.ReadyReplicas,
			Available: d.Status.AvailableReplicas,
			Image:     firstImage(d.Spec.Template.Spec.Containers),
			Age:       formatAge(d.CreationTimestamp),
		})
	}
	sortWorkloads(result)
	return result, nil
}

// ListStatefulSets returns statefulsets in a namespace.
func ListStatefulSets(ctx context.Context, client kubernetes.Interface, namespace string) ([]WorkloadInfo, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	list, err := client.AppsV1().StatefulSets(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	result := make([]WorkloadInfo, 0, len(list.Items))
	for _, s := range list.Items {
		desired := int32(0)
		if s.Spec.Replicas != nil {
			desired = *s.Spec.Replicas
		}
		result = append(result, WorkloadInfo{
			Kind:      "StatefulSet",
			Name:      s.Name,
			Namespace: s.Namespace,
			Desired:   desired,
			Ready:     s.Status.ReadyReplicas,
			Available: s.Status.AvailableReplicas,
			Image:     firstImage(s.Spec.Template.Spec.Containers),
			Age:       formatAge(s.CreationTimestamp),
		})
	}
	sortWorkloads(result)
	return result, nil
}

// ListDaemonSets returns daemonsets in a namespace.
func ListDaemonSets(ctx context.Context, client kubernetes.Interface, namespace string) ([]WorkloadInfo, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	list, err := client.AppsV1().DaemonSets(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	result := make([]WorkloadInfo, 0, len(list.Items))
	for _, d := range list.Items {
		result = append(result, WorkloadInfo{
			Kind:      "DaemonSet",
			Name:      d.Name,
			Namespace: d.Namespace,
			Desired:   d.Status.DesiredNumberScheduled,
			Ready:     d.Status.NumberReady,
			Available: d.Status.NumberAvailable,
			Image:     firstImage(d.Spec.Template.Spec.Containers),
			Age:       formatAge(d.CreationTimestamp),
		})
	}
	sortWorkloads(result)
	return result, nil
}

// ListJobs returns jobs in a namespace.
func ListJobs(ctx context.Context, client kubernetes.Interface, namespace string) ([]JobInfo, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	list, err := client.BatchV1().Jobs(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	result := make([]JobInfo, 0, len(list.Items))
	for _, j := range list.Items {
		completions := fmt.Sprintf("%d", j.Status.Succeeded)
		if j.Spec.Completions != nil {
			completions = fmt.Sprintf("%d/%d", j.Status.Succeeded, *j.Spec.Completions)
		}
		duration := ""
		if j.Status.StartTime != nil {
			if j.Status.CompletionTime != nil {
				duration = j.Status.CompletionTime.Sub(j.Status.StartTime.Time).Round(time.Second).String()
			} else {
				duration = formatAge(*j.Status.StartTime)
			}
		}
		result = append(result, JobInfo{
			Name:        j.Name,
			Namespace:   j.Namespace,
			Completions: completions,
			Duration:    duration,
			Age:         formatAge(j.CreationTimestamp),
		})
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result, nil
}

// ListCronJobs returns cronjobs in a namespace.
func ListCronJobs(ctx context.Context, client kubernetes.Interface, namespace string) ([]CronJobInfo, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	list, err := client.BatchV1().CronJobs(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	result := make([]CronJobInfo, 0, len(list.Items))
	for _, c := range list.Items {
		suspend := false
		if c.Spec.Suspend != nil {
			suspend = *c.Spec.Suspend
		}
		lastSchedule := ""
		if c.Status.LastScheduleTime != nil {
			lastSchedule = formatAge(*c.Status.LastScheduleTime)
		}
		result = append(result, CronJobInfo{
			Name:         c.Name,
			Namespace:    c.Namespace,
			Schedule:     c.Spec.Schedule,
			Suspend:      suspend,
			Active:       len(c.Status.Active),
			LastSchedule: lastSchedule,
			Age:          formatAge(c.CreationTimestamp),
		})
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result, nil
}
