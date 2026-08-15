export {
    AddCluster,
    GetContexts,
    GetVersion,
    Health,
    ImportLocalCluster,
    ListClusters,
    ListCronJobs,
    ListDaemonSets,
    ListDeployments,
    ListIngresses,
    ListJobs,
    ListLocalKubeconfigs,
    ListNamespaces,
    ListNodes,
    ListPods,
    ListServices,
    ListStatefulSets,
    RemoveCluster,
    SwitchContext,
    TestConnection,
    TestKubeconfig,
    ValidateKubeconfig,
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
