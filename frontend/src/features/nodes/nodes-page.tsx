import {useMemo} from 'react'
import {useTranslation} from 'react-i18next'
import type {ColumnDef} from '@tanstack/react-table'
import {DataTable} from '@/components/tables/data-table'
import {ResourcePage} from '@/components/resource-page'
import {NoCluster} from '@/components/no-cluster'
import {Badge} from '@/components/ui/badge'
import {useAppStore} from '@/stores/app-store'
import {useNodeMetrics, useNodes} from '@/hooks/use-k8s'
import type {NodeInfo, NodeMetrics} from '@/lib/wails'

export function NodesPage() {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const {data = [], isLoading, error, refetch} = useNodes(activeCluster?.id ?? null)
    const {data: metrics = [], error: metricsError} = useNodeMetrics(activeCluster?.id ?? null)

    const metricsByNode = useMemo(() => {
        const map = new Map<string, NodeMetrics>()
        for (const m of metrics) map.set(m.name, m)
        return map
    }, [metrics])

    const metricsUnavailable = metricsError != null

    const columns = useMemo<ColumnDef<NodeInfo>[]>(
        () => [
            {accessorKey: 'name', header: t('resources.name')},
            {
                accessorKey: 'status',
                header: t('resources.status'),
                cell: ({row}) => (
                    <Badge variant={row.original.status === 'Ready' ? 'success' : 'destructive'}>
                        {row.original.status}
                    </Badge>
                ),
            },
            {
                accessorKey: 'roles',
                header: t('resources.roles'),
                cell: ({row}) => (row.original.roles ?? []).join(', '),
            },
            {
                id: 'cpu',
                header: t('metrics.cpu'),
                cell: ({row}) => {
                    const m = metricsByNode.get(row.original.name)
                    return m ? (
                        <span className="font-mono text-xs">
                            {m.cpuUsed} / {m.cpuTotal}
                        </span>
                    ) : (
                        '—'
                    )
                },
            },
            {
                id: 'memory',
                header: t('metrics.memory'),
                cell: ({row}) => {
                    const m = metricsByNode.get(row.original.name)
                    return m ? (
                        <span className="font-mono text-xs">
                            {m.memoryUsed} / {m.memoryTotal}
                        </span>
                    ) : (
                        '—'
                    )
                },
            },
            {accessorKey: 'version', header: t('resources.version')},
            {accessorKey: 'age', header: t('resources.age')},
        ],
        [t, metricsByNode]
    )

    if (!activeCluster) return <NoCluster/>

    return (
        <ResourcePage
            title={t('sidebar.nodes')}
            isLoading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            actions={
                metricsUnavailable ? (
                    <span className="text-sm text-muted-foreground">{t('metrics.unavailable')}</span>
                ) : undefined
            }
        >
            <DataTable columns={columns} data={data ?? []}/>
        </ResourcePage>
    )
}
