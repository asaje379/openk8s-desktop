import {useMemo} from 'react'
import {useTranslation} from 'react-i18next'
import type {ColumnDef} from '@tanstack/react-table'
import {DataTable} from '@/components/tables/data-table'
import {ResourcePage} from '@/components/resource-page'
import {NoCluster} from '@/components/no-cluster'
import {Badge} from '@/components/ui/badge'
import {useAppStore} from '@/stores/app-store'
import {usePods} from '@/hooks/use-k8s'
import type {PodInfo} from '@/lib/wails'

function podStatusVariant(status: string): 'success' | 'destructive' | 'warning' | 'outline' {
    switch (status) {
        case 'Running':
            return 'success'
        case 'Failed':
            return 'destructive'
        case 'Pending':
            return 'warning'
        default:
            return 'outline'
    }
}

export function PodsPage() {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const activeNamespace = useAppStore((s) => s.activeNamespace)
    const {data = [], isLoading, error, refetch} = usePods(
        activeCluster?.id ?? null,
        activeNamespace ?? ''
    )

    const columns = useMemo<ColumnDef<PodInfo>[]>(
        () => [
            {
                accessorKey: 'name',
                header: t('resources.name'),
                cell: ({row}) => (
                    <span className="font-mono text-[13px]">{row.original.name}</span>
                ),
            },
            {accessorKey: 'namespace', header: t('resources.namespace')},
            {
                accessorKey: 'status',
                header: t('resources.status'),
                cell: ({row}) => (
                    <Badge variant={podStatusVariant(row.original.status)}>
                        {row.original.status}
                    </Badge>
                ),
            },
            {accessorKey: 'ready', header: t('resources.ready')},
            {accessorKey: 'restarts', header: t('resources.restarts')},
            {accessorKey: 'node', header: t('resources.node')},
            {accessorKey: 'ip', header: t('resources.ip')},
            {accessorKey: 'age', header: t('resources.age')},
        ],
        [t]
    )

    if (!activeCluster) return <NoCluster/>

    return (
        <ResourcePage
            title={t('sidebar.pods')}
            isLoading={isLoading}
            error={error}
            onRetry={() => void refetch()}
        >
            <DataTable columns={columns} data={data ?? []}/>
        </ResourcePage>
    )
}
