package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime/debug"

	"openk8s-desktop/internal/cluster"
	"openk8s-desktop/internal/storage"
)

// App struct
type App struct {
	ctx      context.Context
	clusters cluster.ClusterManager
}

// NewApp creates a new App application struct
func NewApp() *App {
	clusterStore, credentialStore := openStores()
	manager := cluster.NewManager(clusterStore, credentialStore, nil)
	return &App{clusters: manager}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// GetVersion returns the application build information.
func (a *App) GetVersion() map[string]string {
	info := map[string]string{
		"name":    "openk8s-desktop",
		"version": "0.1.0",
	}
	if build, ok := debug.ReadBuildInfo(); ok {
		info["go"] = build.GoVersion
	}
	return info
}

// Health reports the backend health status.
func (a *App) Health() string {
	return "ok"
}

// ListClusters returns all registered clusters.
func (a *App) ListClusters() ([]cluster.Cluster, error) {
	return a.clusters.ListClusters()
}

// AddCluster validates, stores and registers a new cluster.
func (a *App) AddCluster(input cluster.AddClusterInput) (cluster.Cluster, error) {
	return a.clusters.AddCluster(input)
}

// RemoveCluster removes a cluster and its kubeconfig.
func (a *App) RemoveCluster(id string) error {
	return a.clusters.RemoveCluster(id)
}

// TestConnection tests the connection to a stored cluster.
func (a *App) TestConnection(id string) (cluster.ConnectionStatus, error) {
	return a.clusters.TestConnection(id)
}

// GetContexts returns the contexts of a stored cluster's kubeconfig.
func (a *App) GetContexts(id string) ([]cluster.KubeContext, error) {
	return a.clusters.GetContexts(id)
}

// SwitchContext changes the active context of a stored cluster.
func (a *App) SwitchContext(id string, contextName string) error {
	return a.clusters.SwitchContext(id, contextName)
}

// ValidateKubeconfig parses a kubeconfig without saving it.
func (a *App) ValidateKubeconfig(kubeconfig string) (cluster.KubeconfigInfo, error) {
	return a.clusters.ValidateKubeconfig(kubeconfig)
}

// TestKubeconfig tests a connection from a kubeconfig without saving it.
func (a *App) TestKubeconfig(kubeconfig string, contextName string) (cluster.ConnectionStatus, error) {
	return a.clusters.TestKubeconfig(kubeconfig, contextName)
}

// ListLocalKubeconfigs returns the kubeconfigs discovered on the machine.
func (a *App) ListLocalKubeconfigs() ([]cluster.LocalKubeconfig, error) {
	return a.clusters.ListLocalKubeconfigs()
}

// ImportLocalCluster imports a local kubeconfig context as a cluster.
func (a *App) ImportLocalCluster(path string, contextName string, name string) (cluster.Cluster, error) {
	return a.clusters.ImportLocalCluster(path, contextName, name)
}

// openStores returns the persistent stores, falling back to in-memory storage
// if SQLite cannot be opened.
func openStores() (cluster.ClusterStore, cluster.CredentialStore) {
	path := filepath.Join(dataDir(), "openk8s-desktop.db")
	store, err := storage.Open(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "warning: cannot open storage at %s (%v); using in-memory store\n", path, err)
		mem := storage.NewMemoryStore()
		return mem, mem
	}
	return store, store
}

func dataDir() string {
	if dir, err := os.UserConfigDir(); err == nil && dir != "" {
		return filepath.Join(dir, "openk8s-desktop")
	}
	return "."
}
