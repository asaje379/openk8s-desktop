import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {
    AddNamespace,
    ApplyConfigMap,
    ApplySecret,
    DeleteConfigMap,
    DeleteSecret,
    GetClusterMetrics,
    GetConfigMap,
    GetConfigMapYAML,
    GetDeployment,
    GetDeploymentYAML,
    GetPod,
    GetPodYAML,
    GetSecret,
    GetSecretYAML,
    ListCronJobs,
    ListConfigMaps,
    ListDaemonSets,
    ListDeploymentPods,
    ListDeployments,
    ListEvents,
    ListIngresses,
    ListJobs,
    ListNamespaces,
    ListNodeMetrics,
    ListNodes,
    ListPodMetrics,
    ListPods,
    ListSavedNamespaces,
    ListSecrets,
    ListServices,
    ListStatefulSets,
    RemoveNamespace,
    ScaleDeployment,
} from '@/lib/wails'

export function useNamespaces(clusterId: string | null) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'namespaces'],
        queryFn: () => ListNamespaces(clusterId as string),
        enabled: !!clusterId,
        retry: false,
    })
}

export function useNodes(clusterId: string | null) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'nodes'],
        queryFn: () => ListNodes(clusterId as string),
        enabled: !!clusterId,
        retry: false,
    })
}

export function useNodeMetrics(clusterId: string | null) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'node-metrics'],
        queryFn: () => ListNodeMetrics(clusterId as string),
        enabled: !!clusterId,
        retry: false,
    })
}

export function usePodMetrics(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'pod-metrics', namespace],
        queryFn: () => ListPodMetrics(clusterId as string, namespace),
        enabled: !!clusterId && !!namespace,
        retry: false,
    })
}

export function useClusterMetrics(clusterId: string | null) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'cluster-metrics'],
        queryFn: () => GetClusterMetrics(clusterId as string),
        enabled: !!clusterId,
        retry: false,
    })
}

export function usePods(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'pods', namespace],
        queryFn: () => ListPods(clusterId as string, namespace),
        enabled: !!clusterId,
        retry: false,
    })
}

export function useDeployments(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'deployments', namespace],
        queryFn: () => ListDeployments(clusterId as string, namespace),
        enabled: !!clusterId,
        retry: false,
    })
}

export function useStatefulSets(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'statefulsets', namespace],
        queryFn: () => ListStatefulSets(clusterId as string, namespace),
        enabled: !!clusterId,
        retry: false,
    })
}

export function useDaemonSets(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'daemonsets', namespace],
        queryFn: () => ListDaemonSets(clusterId as string, namespace),
        enabled: !!clusterId,
        retry: false,
    })
}

export function useJobs(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'jobs', namespace],
        queryFn: () => ListJobs(clusterId as string, namespace),
        enabled: !!clusterId,
        retry: false,
    })
}

export function useCronJobs(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'cronjobs', namespace],
        queryFn: () => ListCronJobs(clusterId as string, namespace),
        enabled: !!clusterId,
        retry: false,
    })
}

export function useServices(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'services', namespace],
        queryFn: () => ListServices(clusterId as string, namespace),
        enabled: !!clusterId,
        retry: false,
    })
}

export function useIngresses(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'ingresses', namespace],
        queryFn: () => ListIngresses(clusterId as string, namespace),
        enabled: !!clusterId,
        retry: false,
    })
}

export function useSavedNamespaces(clusterId: string | null) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'saved-namespaces'],
        queryFn: () => ListSavedNamespaces(clusterId as string),
        enabled: !!clusterId,
    })
}

export function useAddNamespace() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({clusterId, namespace}: {clusterId: string; namespace: string}) =>
            AddNamespace(clusterId, namespace),
        onSuccess: (_data, {clusterId}) =>
            queryClient.invalidateQueries({queryKey: ['k8s', clusterId, 'saved-namespaces']}),
    })
}

export function useRemoveNamespace() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({clusterId, namespace}: {clusterId: string; namespace: string}) =>
            RemoveNamespace(clusterId, namespace),
        onSuccess: (_data, {clusterId}) =>
            queryClient.invalidateQueries({queryKey: ['k8s', clusterId, 'saved-namespaces']}),
    })
}

export function usePod(clusterId: string | null, namespace: string, name: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'pod', namespace, name],
        queryFn: () => GetPod(clusterId as string, namespace, name),
        enabled: !!clusterId && !!namespace && !!name,
        retry: false,
    })
}

export function usePodYAML(clusterId: string | null, namespace: string, name: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'pod-yaml', namespace, name],
        queryFn: () => GetPodYAML(clusterId as string, namespace, name),
        enabled: !!clusterId && !!namespace && !!name,
        retry: false,
    })
}

export function useEvents(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'events', namespace],
        queryFn: () => ListEvents(clusterId as string, namespace),
        enabled: !!clusterId && !!namespace,
        retry: false,
    })
}

export function useDeployment(clusterId: string | null, namespace: string, name: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'deployment', namespace, name],
        queryFn: () => GetDeployment(clusterId as string, namespace, name),
        enabled: !!clusterId && !!namespace && !!name,
        retry: false,
    })
}

export function useDeploymentYAML(clusterId: string | null, namespace: string, name: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'deployment-yaml', namespace, name],
        queryFn: () => GetDeploymentYAML(clusterId as string, namespace, name),
        enabled: !!clusterId && !!namespace && !!name,
        retry: false,
    })
}

export function useDeploymentPods(clusterId: string | null, namespace: string, name: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'deployment-pods', namespace, name],
        queryFn: () => ListDeploymentPods(clusterId as string, namespace, name),
        enabled: !!clusterId && !!namespace && !!name,
        retry: false,
    })
}

export function useScaleDeployment() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({
            clusterId,
            namespace,
            name,
            replicas,
        }: {
            clusterId: string
            namespace: string
            name: string
            replicas: number
        }) => ScaleDeployment(clusterId, namespace, name, replicas),
        onSuccess: (_data, {clusterId, namespace, name}) => {
            queryClient.invalidateQueries({queryKey: ['k8s', clusterId, 'deployment', namespace, name]})
            queryClient.invalidateQueries({queryKey: ['k8s', clusterId, 'workloads']})
        },
    })
}

export function useConfigMaps(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'configmaps', namespace],
        queryFn: () => ListConfigMaps(clusterId as string, namespace),
        enabled: !!clusterId && !!namespace,
        retry: false,
    })
}

export function useConfigMap(clusterId: string | null, namespace: string, name: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'configmap', namespace, name],
        queryFn: () => GetConfigMap(clusterId as string, namespace, name),
        enabled: !!clusterId && !!namespace && !!name,
        retry: false,
    })
}

export function useConfigMapYAML(clusterId: string | null, namespace: string, name: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'configmap-yaml', namespace, name],
        queryFn: () => GetConfigMapYAML(clusterId as string, namespace, name),
        enabled: !!clusterId && !!namespace && !!name,
        retry: false,
    })
}

export function useApplyConfigMap() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({
            clusterId,
            namespace,
            name,
            yaml,
        }: {
            clusterId: string
            namespace: string
            name: string
            yaml: string
        }) => ApplyConfigMap(clusterId, namespace, name, yaml),
        onSuccess: (_data, {clusterId, namespace, name}) => {
            queryClient.invalidateQueries({queryKey: ['k8s', clusterId, 'configmap', namespace, name]})
            queryClient.invalidateQueries({queryKey: ['k8s', clusterId, 'configmap-yaml', namespace, name]})
            queryClient.invalidateQueries({queryKey: ['k8s', clusterId, 'configmaps']})
        },
    })
}

export function useDeleteConfigMap() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({clusterId, namespace, name}: {clusterId: string; namespace: string; name: string}) =>
            DeleteConfigMap(clusterId, namespace, name),
        onSuccess: (_data, {clusterId}) => {
            queryClient.invalidateQueries({queryKey: ['k8s', clusterId, 'configmaps']})
        },
    })
}

export function useSecrets(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'secrets', namespace],
        queryFn: () => ListSecrets(clusterId as string, namespace),
        enabled: !!clusterId && !!namespace,
        retry: false,
    })
}

export function useSecret(clusterId: string | null, namespace: string, name: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'secret', namespace, name],
        queryFn: () => GetSecret(clusterId as string, namespace, name),
        enabled: !!clusterId && !!namespace && !!name,
        retry: false,
    })
}

export function useSecretYAML(clusterId: string | null, namespace: string, name: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'secret-yaml', namespace, name],
        queryFn: () => GetSecretYAML(clusterId as string, namespace, name),
        enabled: !!clusterId && !!namespace && !!name,
        retry: false,
    })
}

export function useApplySecret() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({
            clusterId,
            namespace,
            name,
            yaml,
        }: {
            clusterId: string
            namespace: string
            name: string
            yaml: string
        }) => ApplySecret(clusterId, namespace, name, yaml),
        onSuccess: (_data, {clusterId, namespace, name}) => {
            queryClient.invalidateQueries({queryKey: ['k8s', clusterId, 'secret', namespace, name]})
            queryClient.invalidateQueries({queryKey: ['k8s', clusterId, 'secret-yaml', namespace, name]})
            queryClient.invalidateQueries({queryKey: ['k8s', clusterId, 'secrets']})
        },
    })
}

export function useDeleteSecret() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({clusterId, namespace, name}: {clusterId: string; namespace: string; name: string}) =>
            DeleteSecret(clusterId, namespace, name),
        onSuccess: (_data, {clusterId}) => {
            queryClient.invalidateQueries({queryKey: ['k8s', clusterId, 'secrets']})
        },
    })
}
