package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	goruntime "runtime"
	"runtime/debug"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"openk8s-desktop/internal/cluster"
	"openk8s-desktop/internal/exec"
	"openk8s-desktop/internal/k8s"
	"openk8s-desktop/internal/logs"
	"openk8s-desktop/internal/portforward"
	"openk8s-desktop/internal/storage"
	"openk8s-desktop/internal/update"
	"openk8s-desktop/internal/watch"
)

// version is the application version. Bumped per release (semver + pre-release).
const version = "0.2.0-beta.6"

// App struct
type App struct {
	ctx         context.Context
	clusters    cluster.ClusterManager
	logs        *logs.Manager
	exec        *exec.Manager
	portforward *portforward.Manager
	watch       *watch.Manager
	updates     *update.Checker
}

// NewApp creates a new App application struct
func NewApp() *App {
	clusterStore, credentialStore := openStores()
	manager := cluster.NewManager(clusterStore, credentialStore, nil)
	return &App{
		clusters:    manager,
		logs:        logs.NewManager(),
		exec:        exec.NewManager(),
		portforward: portforward.NewManager(),
		watch:       watch.NewManager(),
		updates:     update.NewChecker(version, goruntime.GOOS),
	}
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
		"version": version,
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

// CheckForUpdate returns whether a newer version is available. It never
// fails: network errors fall back to the last known result or "no update".
func (a *App) CheckForUpdate() *update.Info {
	return a.updates.Check(a.ctxOrDefault())
}

// DownloadUpdate starts downloading the latest version in the background.
// Progress is emitted as update:progress events.
func (a *App) DownloadUpdate() error {
	info := a.updates.LastInfo()
	if info == nil || !info.HasUpdate {
		return errors.New("no update available")
	}
	if !info.SupportsAutoUpdate {
		return errors.New("auto-update is not supported on this platform")
	}
	go func() {
		err := a.updates.StartDownload(a.ctxOrDefault(), func(p update.Progress) {
			runtime.EventsEmit(a.ctx, "update:progress", p)
		})
		if err != nil {
			runtime.EventsEmit(a.ctx, "update:progress", update.Progress{Phase: "error", Error: err.Error()})
		}
	}()
	return nil
}

// ApplyUpdate replaces the running binary and relaunches the app.
func (a *App) ApplyUpdate() error {
	return a.updates.Apply()
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

// ListNamespaces returns the namespaces of a cluster.
func (a *App) ListNamespaces(clusterID string) ([]k8s.NamespaceInfo, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.ListNamespaces(a.ctxOrDefault(), client)
}

// ListNodes returns the nodes of a cluster.
func (a *App) ListNodes(clusterID string) ([]k8s.NodeInfo, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.ListNodes(a.ctxOrDefault(), client)
}

// ListPods returns the pods of a cluster.
func (a *App) ListPods(clusterID string, namespace string) ([]k8s.PodInfo, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.ListPods(a.ctxOrDefault(), client, namespace)
}

// ListDeployments returns the deployments of a cluster.
func (a *App) ListDeployments(clusterID string, namespace string) ([]k8s.WorkloadInfo, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.ListDeployments(a.ctxOrDefault(), client, namespace)
}

// ListStatefulSets returns the statefulsets of a cluster.
func (a *App) ListStatefulSets(clusterID string, namespace string) ([]k8s.WorkloadInfo, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.ListStatefulSets(a.ctxOrDefault(), client, namespace)
}

// ListDaemonSets returns the daemonsets of a cluster.
func (a *App) ListDaemonSets(clusterID string, namespace string) ([]k8s.WorkloadInfo, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.ListDaemonSets(a.ctxOrDefault(), client, namespace)
}

// ListJobs returns the jobs of a cluster.
func (a *App) ListJobs(clusterID string, namespace string) ([]k8s.JobInfo, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.ListJobs(a.ctxOrDefault(), client, namespace)
}

// ListCronJobs returns the cronjobs of a cluster.
func (a *App) ListCronJobs(clusterID string, namespace string) ([]k8s.CronJobInfo, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.ListCronJobs(a.ctxOrDefault(), client, namespace)
}

// ListServices returns the services of a cluster.
func (a *App) ListServices(clusterID string, namespace string) ([]k8s.ServiceInfo, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.ListServices(a.ctxOrDefault(), client, namespace)
}

// ListIngresses returns the ingresses of a cluster.
func (a *App) ListIngresses(clusterID string, namespace string) ([]k8s.IngressInfo, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.ListIngresses(a.ctxOrDefault(), client, namespace)
}

// ListNodeMetrics returns the CPU/memory usage of every node in a cluster.
func (a *App) ListNodeMetrics(clusterID string) ([]k8s.NodeMetrics, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	restCfg, err := a.clusters.RESTConfig(clusterID)
	if err != nil {
		return nil, err
	}
	metricsClient, err := k8s.NewMetricsClient(restCfg)
	if err != nil {
		return nil, err
	}
	return k8s.ListNodeMetrics(a.ctxOrDefault(), client, metricsClient)
}

// ListPodMetrics returns the CPU/memory usage of every pod in a namespace.
func (a *App) ListPodMetrics(clusterID string, namespace string) ([]k8s.PodMetrics, error) {
	restCfg, err := a.clusters.RESTConfig(clusterID)
	if err != nil {
		return nil, err
	}
	metricsClient, err := k8s.NewMetricsClient(restCfg)
	if err != nil {
		return nil, err
	}
	return k8s.ListPodMetrics(a.ctxOrDefault(), metricsClient, namespace)
}

// GetClusterMetrics returns the aggregated CPU/memory usage of a cluster.
func (a *App) GetClusterMetrics(clusterID string) (*k8s.ClusterMetrics, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	restCfg, err := a.clusters.RESTConfig(clusterID)
	if err != nil {
		return nil, err
	}
	metricsClient, err := k8s.NewMetricsClient(restCfg)
	if err != nil {
		return nil, err
	}
	namespaces, _ := a.clusters.ListSavedNamespaces(clusterID)
	return k8s.GetClusterMetrics(a.ctxOrDefault(), client, metricsClient, namespaces)
}

// ListConfigMaps returns the configmaps of a cluster.
func (a *App) ListConfigMaps(clusterID string, namespace string) ([]k8s.ConfigMapInfo, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.ListConfigMaps(a.ctxOrDefault(), client, namespace)
}

// GetConfigMap returns the detail of a configmap.
func (a *App) GetConfigMap(clusterID string, namespace string, name string) (*k8s.ConfigMapDetail, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.GetConfigMap(a.ctxOrDefault(), client, namespace, name)
}

// GetConfigMapYAML returns the YAML of a configmap.
func (a *App) GetConfigMapYAML(clusterID string, namespace string, name string) (string, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return "", err
	}
	return k8s.GetConfigMapYAML(a.ctxOrDefault(), client, namespace, name)
}

// ApplyConfigMap creates or updates a configmap from a YAML manifest.
func (a *App) ApplyConfigMap(clusterID string, namespace string, name string, yaml string) error {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return err
	}
	return k8s.ApplyConfigMap(a.ctxOrDefault(), client, namespace, name, yaml)
}

// DeleteConfigMap deletes a configmap.
func (a *App) DeleteConfigMap(clusterID string, namespace string, name string) error {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return err
	}
	return k8s.DeleteConfigMap(a.ctxOrDefault(), client, namespace, name)
}

// ListSecrets returns the secrets of a cluster.
func (a *App) ListSecrets(clusterID string, namespace string) ([]k8s.SecretInfo, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.ListSecrets(a.ctxOrDefault(), client, namespace)
}

// GetSecret returns the detail of a secret.
func (a *App) GetSecret(clusterID string, namespace string, name string) (*k8s.SecretDetail, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.GetSecret(a.ctxOrDefault(), client, namespace, name)
}

// GetSecretYAML returns the YAML of a secret.
func (a *App) GetSecretYAML(clusterID string, namespace string, name string) (string, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return "", err
	}
	return k8s.GetSecretYAML(a.ctxOrDefault(), client, namespace, name)
}

// ApplySecret creates or updates a secret from a YAML manifest.
func (a *App) ApplySecret(clusterID string, namespace string, name string, yaml string) error {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return err
	}
	return k8s.ApplySecret(a.ctxOrDefault(), client, namespace, name, yaml)
}

// DeleteSecret deletes a secret.
func (a *App) DeleteSecret(clusterID string, namespace string, name string) error {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return err
	}
	return k8s.DeleteSecret(a.ctxOrDefault(), client, namespace, name)
}

// SearchResources searches resources by name across a cluster.
func (a *App) SearchResources(clusterID string, namespace string, query string) ([]k8s.SearchResult, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.SearchResources(a.ctxOrDefault(), client, namespace, query)
}

// ListSavedNamespaces returns the manually-added namespaces for a cluster.
func (a *App) ListSavedNamespaces(clusterID string) ([]string, error) {
	return a.clusters.ListSavedNamespaces(clusterID)
}

// AddNamespace adds a namespace to the saved list for a cluster.
func (a *App) AddNamespace(clusterID string, namespace string) ([]string, error) {
	return a.clusters.AddNamespace(clusterID, namespace)
}

// RemoveNamespace removes a namespace from the saved list for a cluster.
func (a *App) RemoveNamespace(clusterID string, namespace string) ([]string, error) {
	return a.clusters.RemoveNamespace(clusterID, namespace)
}

// GetPod returns the detail of a pod.
func (a *App) GetPod(clusterID string, namespace string, name string) (*k8s.PodDetail, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.GetPod(a.ctxOrDefault(), client, namespace, name)
}

// GetPodYAML returns the YAML of a pod.
func (a *App) GetPodYAML(clusterID string, namespace string, name string) (string, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return "", err
	}
	return k8s.GetPodYAML(a.ctxOrDefault(), client, namespace, name)
}

// ApplyPod creates or updates a pod from a YAML manifest.
func (a *App) ApplyPod(clusterID string, namespace string, name string, yaml string) error {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return err
	}
	return k8s.ApplyPod(a.ctxOrDefault(), client, namespace, name, yaml)
}

// DeletePod deletes a pod.
func (a *App) DeletePod(clusterID string, namespace string, name string) error {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return err
	}
	return k8s.DeletePod(a.ctxOrDefault(), client, namespace, name)
}

// ListEvents returns the events of a namespace.
func (a *App) ListEvents(clusterID string, namespace string) ([]k8s.EventInfo, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.ListEvents(a.ctxOrDefault(), client, namespace)
}

// StartLogStream starts streaming logs and returns a stream id.
func (a *App) StartLogStream(clusterID string, namespace string, pod string, container string, tailLines int64, follow bool) (string, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return "", err
	}
	return a.logs.Start(a.ctxOrDefault(), client, namespace, pod, container, tailLines, follow, func(event string, data any) {
		runtime.EventsEmit(a.ctx, event, data)
	}), nil
}

// StopLogStream stops a log stream.
func (a *App) StopLogStream(streamID string) {
	a.logs.Stop(streamID)
}

// GetDeployment returns the detail of a deployment.
func (a *App) GetDeployment(clusterID string, namespace string, name string) (*k8s.DeploymentDetail, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.GetDeployment(a.ctxOrDefault(), client, namespace, name)
}

// GetDeploymentYAML returns the YAML of a deployment.
func (a *App) GetDeploymentYAML(clusterID string, namespace string, name string) (string, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return "", err
	}
	return k8s.GetDeploymentYAML(a.ctxOrDefault(), client, namespace, name)
}

// ListDeploymentPods returns the pods of a deployment.
func (a *App) ListDeploymentPods(clusterID string, namespace string, name string) ([]k8s.PodInfo, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return nil, err
	}
	return k8s.ListDeploymentPods(a.ctxOrDefault(), client, namespace, name)
}

// ScaleDeployment updates the replica count of a deployment.
func (a *App) ScaleDeployment(clusterID string, namespace string, name string, replicas int32) error {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return err
	}
	return k8s.ScaleDeployment(a.ctxOrDefault(), client, namespace, name, replicas)
}

// ApplyDeployment creates or updates a deployment from a YAML manifest.
func (a *App) ApplyDeployment(clusterID string, namespace string, name string, yaml string) error {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return err
	}
	return k8s.ApplyDeployment(a.ctxOrDefault(), client, namespace, name, yaml)
}

// DeleteDeployment deletes a deployment.
func (a *App) DeleteDeployment(clusterID string, namespace string, name string) error {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return err
	}
	return k8s.DeleteDeployment(a.ctxOrDefault(), client, namespace, name)
}

// RestartDeployment triggers a rolling restart of a deployment.
func (a *App) RestartDeployment(clusterID string, namespace string, name string) error {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return err
	}
	return k8s.RestartDeployment(a.ctxOrDefault(), client, namespace, name)
}

// ApplyStatefulSet creates or updates a statefulset from a YAML manifest.
func (a *App) ApplyStatefulSet(clusterID string, namespace string, name string, yaml string) error {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return err
	}
	return k8s.ApplyStatefulSet(a.ctxOrDefault(), client, namespace, name, yaml)
}

// DeleteStatefulSet deletes a statefulset.
func (a *App) DeleteStatefulSet(clusterID string, namespace string, name string) error {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return err
	}
	return k8s.DeleteStatefulSet(a.ctxOrDefault(), client, namespace, name)
}

// RestartStatefulSet triggers a rolling restart of a statefulset.
func (a *App) RestartStatefulSet(clusterID string, namespace string, name string) error {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return err
	}
	return k8s.RestartStatefulSet(a.ctxOrDefault(), client, namespace, name)
}

// ApplyDaemonSet creates or updates a daemonset from a YAML manifest.
func (a *App) ApplyDaemonSet(clusterID string, namespace string, name string, yaml string) error {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return err
	}
	return k8s.ApplyDaemonSet(a.ctxOrDefault(), client, namespace, name, yaml)
}

// DeleteDaemonSet deletes a daemonset.
func (a *App) DeleteDaemonSet(clusterID string, namespace string, name string) error {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return err
	}
	return k8s.DeleteDaemonSet(a.ctxOrDefault(), client, namespace, name)
}

// RestartDaemonSet triggers a rolling restart of a daemonset.
func (a *App) RestartDaemonSet(clusterID string, namespace string, name string) error {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return err
	}
	return k8s.RestartDaemonSet(a.ctxOrDefault(), client, namespace, name)
}

// StartDeploymentLogStream streams aggregated logs for all pods of a deployment.
func (a *App) StartDeploymentLogStream(clusterID string, namespace string, deployment string, container string, tailLines int64, follow bool) (string, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return "", err
	}
	pods, err := k8s.ListDeploymentPods(a.ctxOrDefault(), client, namespace, deployment)
	if err != nil {
		return "", err
	}
	podNames := make([]string, 0, len(pods))
	for _, p := range pods {
		podNames = append(podNames, p.Name)
	}
	return a.logs.StartMulti(a.ctxOrDefault(), client, namespace, podNames, container, tailLines, follow, func(event string, data any) {
		runtime.EventsEmit(a.ctx, event, data)
	}), nil
}

// StartExec opens an interactive exec session and returns a session id.
func (a *App) StartExec(clusterID string, namespace string, pod string, container string, command string) (string, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return "", err
	}
	restCfg, err := a.clusters.RESTConfig(clusterID)
	if err != nil {
		return "", err
	}
	return a.exec.Start(a.ctxOrDefault(), client, restCfg, namespace, pod, container, command, func(event string, data any) {
		runtime.EventsEmit(a.ctx, event, data)
	})
}

// WriteExec sends input to an exec session.
func (a *App) WriteExec(sessionID string, data string) error {
	return a.exec.Write(sessionID, data)
}

// ResizeExec resizes an exec session's terminal.
func (a *App) ResizeExec(sessionID string, cols int, rows int) error {
	return a.exec.Resize(sessionID, cols, rows)
}

// CloseExec closes an exec session.
func (a *App) CloseExec(sessionID string) {
	a.exec.Close(sessionID)
}

// StartPortForward begins a port-forward to a pod and returns a forward id.
func (a *App) StartPortForward(clusterID string, namespace string, pod string, localPort int, remotePort int) (string, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return "", err
	}
	restCfg, err := a.clusters.RESTConfig(clusterID)
	if err != nil {
		return "", err
	}
	return a.portforward.Start(a.ctxOrDefault(), client, restCfg, namespace, pod, localPort, remotePort, func(event string, data any) {
		runtime.EventsEmit(a.ctx, event, data)
	})
}

// StopPortForward stops a port-forward.
func (a *App) StopPortForward(forwardID string) {
	a.portforward.Stop(forwardID)
}

// StartWatch begins watching a resource and returns a watch id.
func (a *App) StartWatch(clusterID string, resource string, namespace string) (string, error) {
	client, err := a.clusters.Client(clusterID)
	if err != nil {
		return "", err
	}
	return a.watch.Start(a.ctxOrDefault(), client, resource, namespace, func(event string, data any) {
		runtime.EventsEmit(a.ctx, event, data)
	})
}

// StopWatch stops a watch session.
func (a *App) StopWatch(watchID string) {
	a.watch.Stop(watchID)
}

// OpenExternal opens a URL in the system browser.
func (a *App) OpenExternal(url string) {
	runtime.BrowserOpenURL(a.ctxOrDefault(), url)
}

// ctxOrDefault returns the app context or a background context if not started.
func (a *App) ctxOrDefault() context.Context {
	if a.ctx != nil {
		return a.ctx
	}
	return context.Background()
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
