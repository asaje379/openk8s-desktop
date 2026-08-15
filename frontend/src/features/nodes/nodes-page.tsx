import {useMemo} from 'react'
import {useTranslation} from 'react-i18next'
import type {ColumnDef} from '@tanstack/react-table'
import {DataTable} from '@/components/tables/data-table'
import {ResourcePage} from '@/components/resource-page'
import {NoCluster} from '@/components/no-cluster'
import {Badge} from '@/components/ui/badge'
import {useAppStore} from '@/stores/app-store'
import {useNodes} from '@/hooks/use-k8s'
import type {NodeInfo} from '@/lib/wails'

export function NodesPage() {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const {data = [], isLoading, error, refetch} = useNodes(activeCluster?.id ?? null)

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
            {accessorKey: 'version', header: t('resources.version')},
            {accessorKey: 'age', header: t('resources.age')},
        ],
        [t]
    )

    if (!activeCluster) return <NoCluster/>

    return (
        <ResourcePage title={t('sidebar.nodes')} isLoading={isLoading} error={error} onRetry={() => void refetch()}>
            <DataTable columns={columns} data={data ?? []}/>
        </ResourcePage>
    )
}
