import {useQuery} from '@tanstack/react-query'
import {
    ListCronJobs,
    ListDaemonSets,
    ListDeployments,
    ListIngresses,
    ListJobs,
    ListNamespaces,
    ListNodes,
    ListPods,
    ListServices,
    ListStatefulSets,
} from '@/lib/wails'

export function useNamespaces(clusterId: string | null) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'namespaces'],
        queryFn: () => ListNamespaces(clusterId as string),
        enabled: !!clusterId,
    })
}

export function useNodes(clusterId: string | null) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'nodes'],
        queryFn: () => ListNodes(clusterId as string),
        enabled: !!clusterId,
    })
}

export function usePods(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'pods', namespace],
        queryFn: () => ListPods(clusterId as string, namespace),
        enabled: !!clusterId,
    })
}

export function useDeployments(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'deployments', namespace],
        queryFn: () => ListDeployments(clusterId as string, namespace),
        enabled: !!clusterId,
    })
}

export function useStatefulSets(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'statefulsets', namespace],
        queryFn: () => ListStatefulSets(clusterId as string, namespace),
        enabled: !!clusterId,
    })
}

export function useDaemonSets(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'daemonsets', namespace],
        queryFn: () => ListDaemonSets(clusterId as string, namespace),
        enabled: !!clusterId,
    })
}

export function useJobs(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'jobs', namespace],
        queryFn: () => ListJobs(clusterId as string, namespace),
        enabled: !!clusterId,
    })
}

export function useCronJobs(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'cronjobs', namespace],
        queryFn: () => ListCronJobs(clusterId as string, namespace),
        enabled: !!clusterId,
    })
}

export function useServices(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'services', namespace],
        queryFn: () => ListServices(clusterId as string, namespace),
        enabled: !!clusterId,
    })
}

export function useIngresses(clusterId: string | null, namespace: string) {
    return useQuery({
        queryKey: ['k8s', clusterId, 'ingresses', namespace],
        queryFn: () => ListIngresses(clusterId as string, namespace),
        enabled: !!clusterId,
    })
}
