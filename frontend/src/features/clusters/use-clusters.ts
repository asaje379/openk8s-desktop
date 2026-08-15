import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {AddCluster, GetContexts, ListClusters, RemoveCluster, SwitchContext} from '@/lib/wails'
import type {AddClusterInput} from '@/lib/wails'

export function useClusters() {
    return useQuery({
        queryKey: ['clusters'],
        queryFn: () => ListClusters(),
    })
}

export function useContexts(id: string) {
    return useQuery({
        queryKey: ['cluster-contexts', id],
        queryFn: () => GetContexts(id),
        enabled: !!id,
    })
}

export function useAddCluster() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (input: AddClusterInput) => AddCluster(input),
        onSuccess: () => queryClient.invalidateQueries({queryKey: ['clusters']}),
    })
}

export function useRemoveCluster() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => RemoveCluster(id),
        onSuccess: () => queryClient.invalidateQueries({queryKey: ['clusters']}),
    })
}

export function useSwitchContext() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({id, context}: {id: string; context: string}) => SwitchContext(id, context),
        onSuccess: () => queryClient.invalidateQueries({queryKey: ['clusters']}),
    })
}
