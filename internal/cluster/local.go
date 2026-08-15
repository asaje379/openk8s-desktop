package cluster

import (
	"fmt"
	"os"
	"path/filepath"
)

// discoverKubeconfigPaths returns the candidate kubeconfig paths on the
// machine: $KUBECONFIG (colon-separated) and the default ~/.kube/config.
func discoverKubeconfigPaths() []string {
	seen := make(map[string]bool)
	var paths []string
	add := func(p string) {
		if p == "" || seen[p] {
			return
		}
		seen[p] = true
		paths = append(paths, p)
	}

	if env := os.Getenv("KUBECONFIG"); env != "" {
		for _, p := range filepath.SplitList(env) {
			add(p)
		}
	}
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		add(filepath.Join(home, ".kube", "config"))
	}
	return paths
}

// ListLocalKubeconfigs returns the parseable kubeconfig files discovered on
// the machine, without reading any external system.
func (m *Manager) ListLocalKubeconfigs() ([]LocalKubeconfig, error) {
	result := make([]LocalKubeconfig, 0)
	for _, path := range discoverKubeconfigPaths() {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		cfg, err := ParseKubeconfig(string(data))
		if err != nil {
			continue
		}
		result = append(result, LocalKubeconfig{
			Path:           path,
			CurrentContext: cfg.CurrentContext,
			Contexts:       ContextsFromConfig(cfg),
		})
	}
	return result, nil
}

// ImportLocalCluster reads a local kubeconfig file and registers it as a
// cluster for the given context.
func (m *Manager) ImportLocalCluster(path string, contextName string, name string) (Cluster, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Cluster{}, fmt.Errorf("read kubeconfig %s: %w", path, err)
	}
	return m.AddCluster(AddClusterInput{
		Name:       name,
		Kubeconfig: string(data),
		Context:    contextName,
	})
}
