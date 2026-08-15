export {
    AddCluster,
    AddNamespace,
    CloseExec,
    GetContexts,
    GetDeployment,
    GetDeploymentYAML,
    GetPod,
    GetPodYAML,
    GetVersion,
    Health,
    ImportLocalCluster,
    ListClusters,
    ListCronJobs,
    ListDaemonSets,
    ListDeploymentPods,
    ListDeployments,
    ListEvents,
    ListIngresses,
    ListJobs,
    ListLocalKubeconfigs,
    ListNamespaces,
    ListNodes,
    ListPods,
    ListSavedNamespaces,
    ListServices,
    ListStatefulSets,
    OpenExternal,
    RemoveCluster,
    RemoveNamespace,
    ResizeExec,
    StartExec,
    StartLogStream,
    StartDeploymentLogStream,
    StartPortForward,
    StopLogStream,
    StopPortForward,
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

export {EventsOff, EventsOn} from '../../wailsjs/runtime/runtime'
