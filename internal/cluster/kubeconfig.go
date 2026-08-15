package cluster

import (
	"fmt"
	"sort"

	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

// ParseKubeconfig parses raw kubeconfig YAML and validates that it contains at
// least one context.
func ParseKubeconfig(data string) (*clientcmdapi.Config, error) {
	if data == "" {
		return nil, fmt.Errorf("kubeconfig is empty")
	}
	cfg, err := clientcmd.Load([]byte(data))
	if err != nil {
		return nil, fmt.Errorf("invalid kubeconfig: %w", err)
	}
	if len(cfg.Contexts) == 0 {
		return nil, fmt.Errorf("kubeconfig contains no context")
	}
	return cfg, nil
}

// ContextsFromConfig returns the contexts of a parsed kubeconfig, sorted by name.
func ContextsFromConfig(cfg *clientcmdapi.Config) []KubeContext {
	names := make([]string, 0, len(cfg.Contexts))
	for name := range cfg.Contexts {
		names = append(names, name)
	}
	sort.Strings(names)

	contexts := make([]KubeContext, 0, len(names))
	for _, name := range names {
		ctx := cfg.Contexts[name]
		server := ""
		if cl, ok := cfg.Clusters[ctx.Cluster]; ok {
			server = cl.Server
		}
		contexts = append(contexts, KubeContext{
			Name:      name,
			Cluster:   ctx.Cluster,
			User:      ctx.AuthInfo,
			Namespace: ctx.Namespace,
			Server:    server,
		})
	}
	return contexts
}

// ServerForContext returns the API server URL referenced by a context.
func ServerForContext(cfg *clientcmdapi.Config, contextName string) (string, error) {
	ctx, ok := cfg.Contexts[contextName]
	if !ok {
		return "", fmt.Errorf("context %q not found", contextName)
	}
	cl, ok := cfg.Clusters[ctx.Cluster]
	if !ok {
		return "", fmt.Errorf("cluster %q not found", ctx.Cluster)
	}
	return cl.Server, nil
}
