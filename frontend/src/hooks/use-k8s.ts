import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {
    AddNamespace,
    ListCronJobs,
    ListDaemonSets,
    ListDeployments,
    ListIngresses,
    ListJobs,
    ListNamespaces,
    ListNodes,
    ListPods,
    ListSavedNamespaces,
    ListServices,
    ListStatefulSets,
    RemoveNamespace,
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
