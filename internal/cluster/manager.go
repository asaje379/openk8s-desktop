package cluster

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"k8s.io/client-go/kubernetes"

	"openk8s-desktop/internal/k8s"
)

// defaultClientFactory builds a real Kubernetes client via client-go.
var defaultClientFactory ClientFactory = k8s.NewClient

// Manager is the default ClusterManager implementation.
type Manager struct {
	store   ClusterStore
	creds   CredentialStore
	factory ClientFactory

	mu      sync.RWMutex
	clients map[string]kubernetes.Interface
}

// NewManager creates a Manager. If factory is nil, the default client-go
// factory is used.
func NewManager(store ClusterStore, creds CredentialStore, factory ClientFactory) *Manager {
	if factory == nil {
		factory = defaultClientFactory
	}
	return &Manager{
		store:   store,
		creds:   creds,
		factory: factory,
		clients: make(map[string]kubernetes.Interface),
	}
}

func (m *Manager) ListClusters() ([]Cluster, error) {
	return m.store.ListClusters()
}

func (m *Manager) AddCluster(input AddClusterInput) (Cluster, error) {
	cfg, err := ParseKubeconfig(input.Kubeconfig)
	if err != nil {
		return Cluster{}, err
	}

	contextName := input.Context
	if contextName == "" {
		contextName = cfg.CurrentContext
	}
	if contextName == "" {
		return Cluster{}, fmt.Errorf("no context selected and kubeconfig has no current-context")
	}
	if _, ok := cfg.Contexts[contextName]; !ok {
		return Cluster{}, fmt.Errorf("context %q not found in kubeconfig", contextName)
	}

	server, err := ServerForContext(cfg, contextName)
	if err != nil {
		return Cluster{}, err
	}

	name := input.Name
	if name == "" {
		name = contextName
	}

	now := time.Now().UTC()
	c := Cluster{
		ID:             uuid.NewString(),
		Name:           name,
		Server:         server,
		CurrentContext: contextName,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := m.store.SaveCluster(c); err != nil {
		return Cluster{}, fmt.Errorf("save cluster: %w", err)
	}
	if err := m.creds.SaveKubeconfig(c.ID, input.Kubeconfig); err != nil {
		_ = m.store.DeleteCluster(c.ID)
		return Cluster{}, fmt.Errorf("save kubeconfig: %w", err)
	}

	if client, err := m.factory(input.Kubeconfig, contextName); err == nil {
		m.setClient(c.ID, client)
	}

	return c, nil
}

func (m *Manager) RemoveCluster(id string) error {
	if err := m.store.DeleteCluster(id); err != nil {
		return fmt.Errorf("delete cluster: %w", err)
	}
	if err := m.creds.DeleteKubeconfig(id); err != nil {
		return fmt.Errorf("delete kubeconfig: %w", err)
	}
	m.mu.Lock()
	delete(m.clients, id)
	m.mu.Unlock()
	return nil
}

func (m *Manager) TestConnection(id string) (ConnectionStatus, error) {
	cl, err := m.store.GetCluster(id)
	if err != nil {
		return ConnectionStatus{}, fmt.Errorf("cluster not found: %w", err)
	}
	client, err := m.client(id)
	if err != nil {
		return ConnectionStatus{Connected: false, Server: cl.Server, Message: err.Error()}, nil
	}
	version, err := client.Discovery().ServerVersion()
	if err != nil {
		return ConnectionStatus{Connected: false, Server: cl.Server, Message: err.Error()}, nil
	}
	return ConnectionStatus{Connected: true, Server: cl.Server, Version: version.GitVersion}, nil
}

func (m *Manager) GetContexts(id string) ([]KubeContext, error) {
	kc, err := m.creds.GetKubeconfig(id)
	if err != nil {
		return nil, fmt.Errorf("kubeconfig not found: %w", err)
	}
	cfg, err := ParseKubeconfig(kc)
	if err != nil {
		return nil, err
	}
	return ContextsFromConfig(cfg), nil
}

func (m *Manager) SwitchContext(id string, contextName string) error {
	kc, err := m.creds.GetKubeconfig(id)
	if err != nil {
		return fmt.Errorf("kubeconfig not found: %w", err)
	}
	cfg, err := ParseKubeconfig(kc)
	if err != nil {
		return err
	}
	if _, ok := cfg.Contexts[contextName]; !ok {
		return fmt.Errorf("context %q not found", contextName)
	}
	server, err := ServerForContext(cfg, contextName)
	if err != nil {
		return err
	}

	cl, err := m.store.GetCluster(id)
	if err != nil {
		return fmt.Errorf("cluster not found: %w", err)
	}
	cl.CurrentContext = contextName
	cl.Server = server
	cl.UpdatedAt = time.Now().UTC()
	if err := m.store.SaveCluster(cl); err != nil {
		return fmt.Errorf("update cluster: %w", err)
	}

	client, err := m.factory(kc, contextName)
	if err != nil {
		return err
	}
	m.setClient(id, client)
	return nil
}

func (m *Manager) ValidateKubeconfig(kubeconfig string) (KubeconfigInfo, error) {
	cfg, err := ParseKubeconfig(kubeconfig)
	if err != nil {
		return KubeconfigInfo{}, err
	}
	return KubeconfigInfo{CurrentContext: cfg.CurrentContext, Contexts: ContextsFromConfig(cfg)}, nil
}

func (m *Manager) TestKubeconfig(kubeconfig string, contextName string) (ConnectionStatus, error) {
	cfg, err := ParseKubeconfig(kubeconfig)
	if err != nil {
		return ConnectionStatus{Connected: false, Message: err.Error()}, nil
	}
	if contextName == "" {
		contextName = cfg.CurrentContext
	}
	server, _ := ServerForContext(cfg, contextName)

	client, err := m.factory(kubeconfig, contextName)
	if err != nil {
		return ConnectionStatus{Connected: false, Server: server, Message: err.Error()}, nil
	}
	version, err := client.Discovery().ServerVersion()
	if err != nil {
		return ConnectionStatus{Connected: false, Server: server, Message: err.Error()}, nil
	}
	return ConnectionStatus{Connected: true, Server: server, Version: version.GitVersion}, nil
}

// Client returns the cached (or newly built) Kubernetes client for a cluster.
func (m *Manager) Client(id string) (kubernetes.Interface, error) {
	return m.client(id)
}

// ListSavedNamespaces returns the manually-added namespaces for a cluster.
func (m *Manager) ListSavedNamespaces(clusterID string) ([]string, error) {
	return m.store.ListSavedNamespaces(clusterID)
}

// AddNamespace adds a namespace to the saved list for a cluster.
func (m *Manager) AddNamespace(clusterID string, namespace string) ([]string, error) {
	namespace = strings.TrimSpace(namespace)
	if namespace == "" {
		return nil, fmt.Errorf("namespace name is empty")
	}
	if err := m.store.SaveNamespace(clusterID, namespace); err != nil {
		return nil, fmt.Errorf("save namespace: %w", err)
	}
	return m.store.ListSavedNamespaces(clusterID)
}

// RemoveNamespace removes a namespace from the saved list for a cluster.
func (m *Manager) RemoveNamespace(clusterID string, namespace string) ([]string, error) {
	if err := m.store.DeleteNamespace(clusterID, namespace); err != nil {
		return nil, fmt.Errorf("delete namespace: %w", err)
	}
	return m.store.ListSavedNamespaces(clusterID)
}

func (m *Manager) client(id string) (kubernetes.Interface, error) {
	m.mu.RLock()
	if c, ok := m.clients[id]; ok {
		m.mu.RUnlock()
		return c, nil
	}
	m.mu.RUnlock()

	cl, err := m.store.GetCluster(id)
	if err != nil {
		return nil, err
	}
	kc, err := m.creds.GetKubeconfig(id)
	if err != nil {
		return nil, err
	}
	client, err := m.factory(kc, cl.CurrentContext)
	if err != nil {
		return nil, err
	}
	m.setClient(id, client)
	return client, nil
}

func (m *Manager) setClient(id string, client kubernetes.Interface) {
	m.mu.Lock()
	m.clients[id] = client
	m.mu.Unlock()
}
