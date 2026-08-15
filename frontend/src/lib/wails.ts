export {
    AddCluster,
    GetContexts,
    GetVersion,
    Health,
    ListClusters,
    RemoveCluster,
    SwitchContext,
    TestConnection,
    TestKubeconfig,
    ValidateKubeconfig,
} from '../../wailsjs/go/main/App'

import type {cluster} from '../../wailsjs/go/models'

export type Cluster = cluster.Cluster
export type KubeContext = cluster.KubeContext
export type AddClusterInput = cluster.AddClusterInput
export type ConnectionStatus = cluster.ConnectionStatus
export type KubeconfigInfo = cluster.KubeconfigInfo
