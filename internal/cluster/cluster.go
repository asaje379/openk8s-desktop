package cluster

import (
	"time"

	"k8s.io/client-go/kubernetes"
)

// Cluster is a locally-registered Kubernetes cluster connection.
type Cluster struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Server         string    `json:"server"`
	CurrentContext string    `json:"currentContext"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// KubeContext represents a context entry within a kubeconfig.
type KubeContext struct {
	Name      string `json:"name"`
	Cluster   string `json:"cluster"`
	User      string `json:"user"`
	Namespace string `json:"namespace,omitempty"`
	Server    string `json:"server"`
}

// AddClusterInput is the input required to register a cluster.
type AddClusterInput struct {
	Name       string `json:"name"`
	Kubeconfig string `json:"kubeconfig"`
	Context    string `json:"context,omitempty"`
}

// ConnectionStatus reports the result of a connection test.
type ConnectionStatus struct {
	Connected bool   `json:"connected"`
	Server    string `json:"server"`
	Version   string `json:"version"`
	Message   string `json:"message,omitempty"`
}

// KubeconfigInfo is the result of validating a kubeconfig without saving it.
type KubeconfigInfo struct {
	CurrentContext string        `json:"currentContext"`
	Contexts       []KubeContext `json:"contexts"`
}

// LocalKubeconfig is a discovered kubeconfig file on the machine.
type LocalKubeconfig struct {
	Path           string        `json:"path"`
	CurrentContext string        `json:"currentContext"`
	Contexts       []KubeContext `json:"contexts"`
}

// ClusterStore persists cluster metadata.
type ClusterStore interface {
	ListClusters() ([]Cluster, error)
	GetCluster(id string) (Cluster, error)
	SaveCluster(c Cluster) error
	DeleteCluster(id string) error
}

// CredentialStore persists sensitive kubeconfig material.
type CredentialStore interface {
	SaveKubeconfig(id string, kubeconfig string) error
	GetKubeconfig(id string) (string, error)
	DeleteKubeconfig(id string) error
}

// ClusterManager manages Kubernetes cluster connections.
type ClusterManager interface {
	ListClusters() ([]Cluster, error)
	AddCluster(input AddClusterInput) (Cluster, error)
	RemoveCluster(id string) error
	TestConnection(id string) (ConnectionStatus, error)
	GetContexts(id string) ([]KubeContext, error)
	SwitchContext(id string, contextName string) error
	ValidateKubeconfig(kubeconfig string) (KubeconfigInfo, error)
	TestKubeconfig(kubeconfig string, contextName string) (ConnectionStatus, error)
	ListLocalKubeconfigs() ([]LocalKubeconfig, error)
	ImportLocalCluster(path string, contextName string, name string) (Cluster, error)
	Client(id string) (kubernetes.Interface, error)
}

// ClientFactory builds a Kubernetes client from a kubeconfig and context.
type ClientFactory func(kubeconfig string, contextName string) (kubernetes.Interface, error)
