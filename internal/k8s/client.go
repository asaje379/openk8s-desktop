package k8s

import (
	"fmt"
	"time"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// RESTConfig builds a rest.Config for a given kubeconfig and context.
func RESTConfig(kubeconfig string, contextName string) (*rest.Config, error) {
	cfg, err := clientcmd.Load([]byte(kubeconfig))
	if err != nil {
		return nil, fmt.Errorf("invalid kubeconfig: %w", err)
	}
	clientConfig := clientcmd.NewDefaultClientConfig(*cfg, &clientcmd.ConfigOverrides{
		CurrentContext: contextName,
	})
	restCfg, err := clientConfig.ClientConfig()
	if err != nil {
		return nil, fmt.Errorf("build rest config: %w", err)
	}
	restCfg.Timeout = 10 * time.Second
	return restCfg, nil
}

// NewClient builds a Kubernetes clientset for a kubeconfig and context.
func NewClient(kubeconfig string, contextName string) (kubernetes.Interface, error) {
	restCfg, err := RESTConfig(kubeconfig, contextName)
	if err != nil {
		return nil, err
	}
	return kubernetes.NewForConfig(restCfg)
}
