package cluster_test

import (
	"os"
	"path/filepath"
	"testing"
)

func TestListLocalKubeconfigs(t *testing.T) {
	m := newTestManager(t, okFactory(t))

	dir := t.TempDir()
	kcPath := filepath.Join(dir, "config")
	if err := os.WriteFile(kcPath, []byte(testKubeconfig), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("KUBECONFIG", kcPath)
	t.Setenv("HOME", dir)

	list, err := m.ListLocalKubeconfigs()
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 discovered kubeconfig, got %d", len(list))
	}
	if list[0].Path != kcPath {
		t.Fatalf("unexpected path %q", list[0].Path)
	}
	if len(list[0].Contexts) != 2 {
		t.Fatalf("expected 2 contexts, got %d", len(list[0].Contexts))
	}
	if list[0].Contexts[0].Server != "https://prod.example.com:6443" {
		t.Fatalf("unexpected server %q", list[0].Contexts[0].Server)
	}
}

func TestImportLocalCluster(t *testing.T) {
	m := newTestManager(t, okFactory(t))

	dir := t.TempDir()
	kcPath := filepath.Join(dir, "config")
	if err := os.WriteFile(kcPath, []byte(testKubeconfig), 0o600); err != nil {
		t.Fatal(err)
	}

	c, err := m.ImportLocalCluster(kcPath, "prod-context", "prod")
	if err != nil {
		t.Fatal(err)
	}
	if c.Name != "prod" {
		t.Fatalf("expected name prod, got %q", c.Name)
	}
	if c.Server != "https://prod.example.com:6443" {
		t.Fatalf("unexpected server %q", c.Server)
	}

	list, _ := m.ListClusters()
	if len(list) != 1 {
		t.Fatalf("expected 1 imported cluster, got %d", len(list))
	}
}

func TestImportLocalCluster_MissingFile(t *testing.T) {
	m := newTestManager(t, okFactory(t))
	if _, err := m.ImportLocalCluster("/nonexistent/config", "ctx", "name"); err == nil {
		t.Fatal("expected error for missing file")
	}
}
