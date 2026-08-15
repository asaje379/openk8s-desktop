package k8s

import (
	"context"
	"fmt"
	"time"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// withTimeout returns a context with a deadline for non-streaming requests,
// preserving any existing deadline. Streaming operations (logs, exec,
// port-forward, watch) must NOT use this and instead use a cancelable context.
func withTimeout(parent context.Context) (context.Context, context.CancelFunc) {
	if _, ok := parent.Deadline(); ok {
		return context.WithCancel(parent)
	}
	return context.WithTimeout(parent, 30*time.Second)
}

// RESTConfig builds a rest.Config for a given kubeconfig and context.
// No global timeout is set: streaming operations need unbounded duration.
func RESTConfig(kubeconfig string, contextName string) (*rest.Config, error) {
	cfg, err := clientcmd.Load([]byte(kubeconfig))
	if err != nil {
		return nil, fmt.Errorf("invalid kubeconfig: %w", err)
	}
	clientConfig := clientcmd.NewDefaultClientConfig(*cfg, &clientcmd.ConfigOverrides{
		CurrentContext: contextName,
	})
	return clientConfig.ClientConfig()
}

// NewClient builds a Kubernetes clientset for a kubeconfig and context.
func NewClient(kubeconfig string, contextName string) (kubernetes.Interface, error) {
	restCfg, err := RESTConfig(kubeconfig, contextName)
	if err != nil {
		return nil, err
	}
	return kubernetes.NewForConfig(restCfg)
}
