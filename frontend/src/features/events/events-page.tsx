import {useMemo} from 'react'
import {useTranslation} from 'react-i18next'
import type {ColumnDef} from '@tanstack/react-table'
import {DataTable} from '@/components/tables/data-table'
import {ResourcePage} from '@/components/resource-page'
import {NoCluster} from '@/components/no-cluster'
import {Badge} from '@/components/ui/badge'
import {useAppStore} from '@/stores/app-store'
import {useEvents} from '@/hooks/use-k8s'
import type {EventInfo} from '@/lib/wails'

export function EventsPage() {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const activeNamespace = useAppStore((s) => s.activeNamespace)
    const {data = [], isLoading, error, refetch} = useEvents(
        activeCluster?.id ?? null,
        activeNamespace ?? ''
    )

    const columns = useMemo<ColumnDef<EventInfo>[]>(
        () => [
            {
                accessorKey: 'type',
                header: t('resources.type'),
                cell: ({row}) => (
                    <Badge variant={row.original.type === 'Warning' ? 'warning' : 'success'}>
                        {row.original.type}
                    </Badge>
                ),
            },
            {accessorKey: 'reason', header: t('resources.reason')},
            {
                accessorKey: 'object',
                header: t('resources.object'),
                cell: ({row}) => (
                    <span className="font-mono text-xs">{row.original.object}</span>
                ),
            },
            {accessorKey: 'kind', header: t('resources.kind')},
            {accessorKey: 'namespace', header: t('resources.namespace')},
            {accessorKey: 'message', header: t('resources.message')},
            {accessorKey: 'count', header: t('resources.count')},
            {accessorKey: 'age', header: t('resources.age')},
        ],
        [t]
    )

    if (!activeCluster) return <NoCluster/>

    return (
        <ResourcePage
            title={t('sidebar.events')}
            isLoading={isLoading}
            error={error}
            onRetry={() => void refetch()}
        >
            <DataTable columns={columns} data={data ?? []}/>
        </ResourcePage>
    )
}
