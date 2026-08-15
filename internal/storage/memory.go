package storage

import (
	"fmt"
	"sync"

	"openk8s-desktop/internal/cluster"
)

// MemoryStore is an in-memory implementation of both cluster.ClusterStore and
// cluster.CredentialStore, useful for tests and as a fallback.
type MemoryStore struct {
	mu         sync.RWMutex
	clusters   map[string]cluster.Cluster
	kubeconfig map[string]string
	namespaces map[string][]string
}

// NewMemoryStore creates an empty MemoryStore.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		clusters:   make(map[string]cluster.Cluster),
		kubeconfig: make(map[string]string),
		namespaces: make(map[string][]string),
	}
}

func (m *MemoryStore) ListClusters() ([]cluster.Cluster, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]cluster.Cluster, 0, len(m.clusters))
	for _, c := range m.clusters {
		out = append(out, c)
	}
	return out, nil
}

func (m *MemoryStore) GetCluster(id string) (cluster.Cluster, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	c, ok := m.clusters[id]
	if !ok {
		return cluster.Cluster{}, fmt.Errorf("cluster %q not found", id)
	}
	return c, nil
}

func (m *MemoryStore) SaveCluster(c cluster.Cluster) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.clusters[c.ID] = c
	return nil
}

func (m *MemoryStore) DeleteCluster(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.clusters, id)
	return nil
}

func (m *MemoryStore) SaveKubeconfig(id string, kubeconfig string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.kubeconfig[id] = kubeconfig
	return nil
}

func (m *MemoryStore) GetKubeconfig(id string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	kc, ok := m.kubeconfig[id]
	if !ok {
		return "", fmt.Errorf("kubeconfig %q not found", id)
	}
	return kc, nil
}

func (m *MemoryStore) DeleteKubeconfig(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.kubeconfig, id)
	return nil
}

func (m *MemoryStore) ListSavedNamespaces(clusterID string) ([]string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	namespaces := make([]string, 0)
	seen := make(map[string]bool)
	for _, ns := range m.clusterNamespaces(clusterID) {
		if !seen[ns] {
			seen[ns] = true
			namespaces = append(namespaces, ns)
		}
	}
	return namespaces, nil
}

func (m *MemoryStore) SaveNamespace(clusterID string, namespace string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.namespaces == nil {
		m.namespaces = make(map[string][]string)
	}
	for _, ns := range m.namespaces[clusterID] {
		if ns == namespace {
			return nil
		}
	}
	m.namespaces[clusterID] = append(m.namespaces[clusterID], namespace)
	return nil
}

func (m *MemoryStore) DeleteNamespace(clusterID string, namespace string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	kept := make([]string, 0)
	for _, ns := range m.namespaces[clusterID] {
		if ns != namespace {
			kept = append(kept, ns)
		}
	}
	m.namespaces[clusterID] = kept
	return nil
}

func (m *MemoryStore) clusterNamespaces(clusterID string) []string {
	return m.namespaces[clusterID]
}
