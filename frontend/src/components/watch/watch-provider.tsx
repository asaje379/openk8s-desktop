import {useEffect, useRef} from 'react'
import {useQueryClient, type QueryKey} from '@tanstack/react-query'
import {EventsOn, StartWatch, StopWatch} from '@/lib/wails'
import {useAppStore} from '@/stores/app-store'

interface WatchData {
    id: string
    resource: string
    namespace: string
    items: unknown[]
}

interface WatchInfo {
    id: string
    resource: string
    namespace: string
}

interface WatchRef {
    clusterId: string
    resource: string
    namespace: string
}

const CLUSTER_SCOPED = new Set(['nodes', 'namespaces'])
const WORKLOAD_RESOURCES = new Set([
    'deployments',
    'statefulsets',
    'daemonsets',
    'jobs',
    'cronjobs',
])

const NAMESPACED_RESOURCES = [
    'pods',
    'deployments',
    'statefulsets',
    'daemonsets',
    'jobs',
    'cronjobs',
    'services',
    'ingresses',
    'configmaps',
    'secrets',
    'events',
]

function queryKeysFor(clusterId: string, resource: string, namespace: string): QueryKey[] {
    if (CLUSTER_SCOPED.has(resource)) {
        return [['k8s', clusterId, resource]]
    }
    const keys: QueryKey[] = [['k8s', clusterId, resource, namespace]]
    if (WORKLOAD_RESOURCES.has(resource)) {
        keys.push(['k8s', clusterId, 'workloads', resource, namespace])
    }
    return keys
}

export function WatchProvider() {
    const activeCluster = useAppStore((s) => s.activeCluster)
    const activeNamespace = useAppStore((s) => s.activeNamespace)
    const queryClient = useQueryClient()
    const watchesRef = useRef<Map<string, WatchRef>>(new Map())

    useEffect(() => {
        const onData = (payload: WatchData) => {
            const watch = watchesRef.current.get(payload.id)
            if (!watch) return
            for (const key of queryKeysFor(watch.clusterId, watch.resource, watch.namespace)) {
                queryClient.setQueryData(key, payload.items)
            }
        }
        const onEnd = (payload: WatchInfo) => {
            watchesRef.current.delete(payload.id)
        }

        const offData = EventsOn('watch:data', onData)
        const offError = EventsOn('watch:error', () => {})
        const offEnd = EventsOn('watch:end', onEnd)
        return () => {
            offData()
            offError()
            offEnd()
        }
    }, [queryClient])

    useEffect(() => {
        const clusterId = activeCluster?.id
        if (!clusterId) return

        const ids: string[] = []

        const start = async (resource: string, namespace: string) => {
            try {
                const id = await StartWatch(clusterId, resource, namespace)
                watchesRef.current.set(id, {clusterId, resource, namespace})
                ids.push(id)
            } catch {
                // ignore resources that are not watchable (e.g. RBAC-restricted)
            }
        }

        void start('nodes', '')
        void start('namespaces', '')
        if (activeNamespace) {
            for (const resource of NAMESPACED_RESOURCES) {
                void start(resource, activeNamespace)
            }
        }

        return () => {
            for (const id of ids) {
                watchesRef.current.delete(id)
                StopWatch(id)
            }
        }
    }, [activeCluster?.id, activeNamespace])

    return null
}
