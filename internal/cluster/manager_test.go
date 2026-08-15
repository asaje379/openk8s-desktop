package cluster_test

import (
	"fmt"
	"testing"

	"k8s.io/apimachinery/pkg/version"
	fakediscovery "k8s.io/client-go/discovery/fake"
	"k8s.io/client-go/kubernetes"
	kubernetesfake "k8s.io/client-go/kubernetes/fake"

	"openk8s-desktop/internal/cluster"
	"openk8s-desktop/internal/storage"
)

// okFactory returns a fake clientset reporting a fixed server version.
func okFactory(t *testing.T) cluster.ClientFactory {
	t.Helper()
	return func(kubeconfig, contextName string) (kubernetes.Interface, error) {
		c := kubernetesfake.NewSimpleClientset()
		fd, ok := c.Discovery().(*fakediscovery.FakeDiscovery)
		if !ok {
			t.Fatalf("unexpected discovery type %T", c.Discovery())
		}
		fd.FakedServerVersion = &version.Info{GitVersion: "v1.30.0"}
		return c, nil
	}
}

// errFactory simulates an unreachable cluster.
func errFactory() cluster.ClientFactory {
	return func(kubeconfig, contextName string) (kubernetes.Interface, error) {
		return nil, fmt.Errorf("connection refused")
	}
}

func newTestManager(t *testing.T, factory cluster.ClientFactory) cluster.ClusterManager {
	t.Helper()
	mem := storage.NewMemoryStore()
	return cluster.NewManager(mem, mem, factory)
}

func TestAddCluster_UsesCurrentContext(t *testing.T) {
	m := newTestManager(t, okFactory(t))

	c, err := m.AddCluster(cluster.AddClusterInput{Kubeconfig: testKubeconfig})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if c.ID == "" {
		t.Fatal("expected a generated cluster id")
	}
	if c.CurrentContext != "prod-context" {
		t.Fatalf("expected context prod-context, got %q", c.CurrentContext)
	}
	if c.Server != "https://prod.example.com:6443" {
		t.Fatalf("unexpected server %q", c.Server)
	}
	if c.Name != "prod-context" {
		t.Fatalf("expected default name prod-context, got %q", c.Name)
	}
}

func TestAddCluster_ExplicitContextAndName(t *testing.T) {
	m := newTestManager(t, okFactory(t))

	c, err := m.AddCluster(cluster.AddClusterInput{
		Name:       "my-staging",
		Kubeconfig: testKubeconfig,
		Context:    "staging-context",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if c.Name != "my-staging" {
		t.Fatalf("expected name my-staging, got %q", c.Name)
	}
	if c.CurrentContext != "staging-context" {
		t.Fatalf("expected context staging-context, got %q", c.CurrentContext)
	}
	if c.Server != "https://staging.example.com:6443" {
		t.Fatalf("unexpected server %q", c.Server)
	}
}

func TestAddCluster_InvalidKubeconfig(t *testing.T) {
	m := newTestManager(t, okFactory(t))
	if _, err := m.AddCluster(cluster.AddClusterInput{Kubeconfig: "invalid"}); err == nil {
		t.Fatal("expected error for invalid kubeconfig")
	}
}

func TestAddCluster_NoContext(t *testing.T) {
	m := newTestManager(t, okFactory(t))
	if _, err := m.AddCluster(cluster.AddClusterInput{Kubeconfig: testKubeconfigNoCurrent}); err == nil {
		t.Fatal("expected error when no context is selected")
	}
}

func TestAddCluster_UnknownContext(t *testing.T) {
	m := newTestManager(t, okFactory(t))
	if _, err := m.AddCluster(cluster.AddClusterInput{Kubeconfig: testKubeconfig, Context: "nope"}); err == nil {
		t.Fatal("expected error for unknown context")
	}
}

func TestListAndRemove(t *testing.T) {
	m := newTestManager(t, okFactory(t))
	if _, err := m.AddCluster(cluster.AddClusterInput{Kubeconfig: testKubeconfig}); err != nil {
		t.Fatal(err)
	}

	list, err := m.ListClusters()
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 cluster, got %d", len(list))
	}

	if err := m.RemoveCluster(list[0].ID); err != nil {
		t.Fatal(err)
	}
	list, _ = m.ListClusters()
	if len(list) != 0 {
		t.Fatalf("expected 0 clusters after remove, got %d", len(list))
	}
}

func TestGetContexts(t *testing.T) {
	m := newTestManager(t, okFactory(t))
	c, err := m.AddCluster(cluster.AddClusterInput{Kubeconfig: testKubeconfig})
	if err != nil {
		t.Fatal(err)
	}

	contexts, err := m.GetContexts(c.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(contexts) != 2 {
		t.Fatalf("expected 2 contexts, got %d", len(contexts))
	}
}

func TestSwitchContext(t *testing.T) {
	m := newTestManager(t, okFactory(t))
	c, err := m.AddCluster(cluster.AddClusterInput{Kubeconfig: testKubeconfig})
	if err != nil {
		t.Fatal(err)
	}

	if err := m.SwitchContext(c.ID, "staging-context"); err != nil {
		t.Fatal(err)
	}

	list, err := m.ListClusters()
	if err != nil {
		t.Fatal(err)
	}
	var got cluster.Cluster
	for _, cl := range list {
		if cl.ID == c.ID {
			got = cl
		}
	}
	if got.CurrentContext != "staging-context" {
		t.Fatalf("expected staging-context, got %q", got.CurrentContext)
	}
	if got.Server != "https://staging.example.com:6443" {
		t.Fatalf("unexpected server %q", got.Server)
	}
}

func TestSwitchContext_Unknown(t *testing.T) {
	m := newTestManager(t, okFactory(t))
	c, _ := m.AddCluster(cluster.AddClusterInput{Kubeconfig: testKubeconfig})
	if err := m.SwitchContext(c.ID, "nope"); err == nil {
		t.Fatal("expected error for unknown context")
	}
}

func TestTestConnection_Success(t *testing.T) {
	m := newTestManager(t, okFactory(t))
	c, err := m.AddCluster(cluster.AddClusterInput{Kubeconfig: testKubeconfig})
	if err != nil {
		t.Fatal(err)
	}

	status, err := m.TestConnection(c.ID)
	if err != nil {
		t.Fatal(err)
	}
	if !status.Connected {
		t.Fatalf("expected connected, got %+v", status)
	}
	if status.Version != "v1.30.0" {
		t.Fatalf("expected version v1.30.0, got %q", status.Version)
	}
}

func TestTestConnection_Failure(t *testing.T) {
	m := newTestManager(t, errFactory())
	c, err := m.AddCluster(cluster.AddClusterInput{Kubeconfig: testKubeconfig})
	if err != nil {
		t.Fatal(err)
	}

	status, err := m.TestConnection(c.ID)
	if err != nil {
		t.Fatal(err)
	}
	if status.Connected {
		t.Fatalf("expected disconnected, got %+v", status)
	}
	if status.Message == "" {
		t.Fatal("expected a failure message")
	}
}

func TestValidateKubeconfig(t *testing.T) {
	m := newTestManager(t, okFactory(t))
	info, err := m.ValidateKubeconfig(testKubeconfig)
	if err != nil {
		t.Fatal(err)
	}
	if info.CurrentContext != "prod-context" {
		t.Fatalf("expected prod-context, got %q", info.CurrentContext)
	}
	if len(info.Contexts) != 2 {
		t.Fatalf("expected 2 contexts, got %d", len(info.Contexts))
	}
}

func TestTestKubeconfig_Success(t *testing.T) {
	m := newTestManager(t, okFactory(t))
	status, err := m.TestKubeconfig(testKubeconfig, "prod-context")
	if err != nil {
		t.Fatal(err)
	}
	if !status.Connected {
		t.Fatalf("expected connected, got %+v", status)
	}
}
