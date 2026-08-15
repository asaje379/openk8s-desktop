package k8s

import (
	"context"
	"fmt"
	"sort"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// ListServices returns services in a namespace.
func ListServices(ctx context.Context, client kubernetes.Interface, namespace string) ([]ServiceInfo, error) {
	ctx, cancel := withTimeout(ctx)
	defer cancel()

	list, err := client.CoreV1().Services(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	result := make([]ServiceInfo, 0, len(list.Items))
	for _, s := range list.Items {
		ports := make([]string, 0, len(s.Spec.Ports))
		for _, p := range s.Spec.Ports {
			ports = append(ports, fmt.Sprintf("%d/%s", p.Port, p.Protocol))
		}

		externalIP := ""
		if len(s.Status.LoadBalancer.Ingress) > 0 {
			ing := s.Status.LoadBalancer.Ingress[0]
			if ing.IP != "" {
				externalIP = ing.IP
			} else if ing.Hostname != "" {
				externalIP = ing.Hostname
			}
		} else if len(s.Spec.ExternalIPs) > 0 {
			externalIP = s.Spec.ExternalIPs[0]
		}

		result = append(result, ServiceInfo{
			Name:       s.Name,
			Namespace:  s.Namespace,
			Type:       string(s.Spec.Type),
			ClusterIP:  s.Spec.ClusterIP,
			ExternalIP: externalIP,
			Ports:      strings.Join(ports, ", "),
			Age:        formatAge(s.CreationTimestamp),
		})
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result, nil
}
