export {
    AddCluster,
    AddNamespace,
    ApplyConfigMap,
    ApplyDaemonSet,
    ApplyDeployment,
    ApplyPod,
    ApplySecret,
    ApplyStatefulSet,
    CloseExec,
    DeleteConfigMap,
    DeleteDaemonSet,
    DeleteDeployment,
    DeletePod,
    DeleteSecret,
    DeleteStatefulSet,
    GetClusterMetrics,
    GetConfigMap,
    GetConfigMapYAML,
    GetContexts,
    GetDeployment,
    GetDeploymentYAML,
    GetPod,
    GetPodYAML,
    GetSecret,
    GetSecretYAML,
    GetVersion,
    Health,
    ImportLocalCluster,
    ListClusters,
    ListConfigMaps,
    ListCronJobs,
    ListDaemonSets,
    ListDeploymentPods,
    ListDeployments,
    ListEvents,
    ListIngresses,
    ListJobs,
    ListLocalKubeconfigs,
    ListNamespaces,
    ListNodeMetrics,
    ListNodes,
    ListPodMetrics,
    ListPods,
    ListSavedNamespaces,
    ListSecrets,
    ListServices,
    ListStatefulSets,
    OpenExternal,
    RemoveCluster,
    RemoveNamespace,
    ResizeExec,
    RestartDaemonSet,
    RestartDeployment,
    RestartStatefulSet,
    ScaleDeployment,
    SearchResources,
    StartExec,
    StartLogStream,
    StartDeploymentLogStream,
    StartPortForward,
    StartWatch,
    StopLogStream,
    StopPortForward,
    StopWatch,
    SwitchContext,
    TestConnection,
    TestKubeconfig,
    ValidateKubeconfig,
    WriteExec,
} from '../../wailsjs/go/main/App'

import type {cluster} from '../../wailsjs/go/models'
import type {k8s} from '../../wailsjs/go/models'

export type Cluster = cluster.Cluster
export type KubeContext = cluster.KubeContext
export type AddClusterInput = cluster.AddClusterInput
export type ConnectionStatus = cluster.ConnectionStatus
export type KubeconfigInfo = cluster.KubeconfigInfo
export type LocalKubeconfig = cluster.LocalKubeconfig

export type NamespaceInfo = k8s.NamespaceInfo
export type NodeInfo = k8s.NodeInfo
export type PodInfo = k8s.PodInfo
export type WorkloadInfo = k8s.WorkloadInfo
export type JobInfo = k8s.JobInfo
export type CronJobInfo = k8s.CronJobInfo
export type ServiceInfo = k8s.ServiceInfo
export type IngressInfo = k8s.IngressInfo
export type ContainerInfo = k8s.ContainerInfo
export type PodDetail = k8s.PodDetail
export type EventInfo = k8s.EventInfo
export type DeploymentDetail = k8s.DeploymentDetail
export type NodeMetrics = k8s.NodeMetrics
export type PodMetrics = k8s.PodMetrics
export type ClusterMetrics = k8s.ClusterMetrics
export type ConfigMapInfo = k8s.ConfigMapInfo
export type ConfigMapDetail = k8s.ConfigMapDetail
export type SecretInfo = k8s.SecretInfo
export type SecretDetail = k8s.SecretDetail
export type SearchResult = k8s.SearchResult

export {EventsOff, EventsOn} from '../../wailsjs/runtime/runtime'
