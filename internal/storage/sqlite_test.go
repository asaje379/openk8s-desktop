package storage

import (
	"encoding/json"
	"testing"

	"openk8s-desktop/internal/cluster"
)

func TestListClusters_Empty_ReturnsEmptySlice(t *testing.T) {
	store, err := Open(t.TempDir() + "/test.db")
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	clusters, err := store.ListClusters()
	if err != nil {
		t.Fatal(err)
	}
	if clusters == nil {
		t.Fatal("expected non-nil slice, got nil (would serialize to JSON null)")
	}
	data, err := json.Marshal(clusters)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "[]" {
		t.Fatalf("expected JSON [], got %s", string(data))
	}
}

func TestClusterRoundTrip(t *testing.T) {
	store, err := Open(t.TempDir() + "/test.db")
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	c := cluster.Cluster{
		ID:             "id-1",
		Name:           "prod",
		Server:         "https://prod.example.com:6443",
		CurrentContext: "prod-context",
	}
	if err := store.SaveCluster(c); err != nil {
		t.Fatal(err)
	}

	got, err := store.GetCluster("id-1")
	if err != nil {
		t.Fatal(err)
	}
	if got.Name != "prod" || got.Server != c.Server || got.CurrentContext != "prod-context" {
		t.Fatalf("unexpected round-trip result: %+v", got)
	}

	if err := store.SaveKubeconfig("id-1", "apiVersion: v1"); err != nil {
		t.Fatal(err)
	}
	kc, err := store.GetKubeconfig("id-1")
	if err != nil {
		t.Fatal(err)
	}
	if kc != "apiVersion: v1" {
		t.Fatalf("unexpected kubeconfig %q", kc)
	}
}
