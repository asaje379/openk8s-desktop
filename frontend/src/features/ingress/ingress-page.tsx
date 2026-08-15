import {useMemo} from 'react'
import {useTranslation} from 'react-i18next'
import type {ColumnDef} from '@tanstack/react-table'
import {DataTable} from '@/components/tables/data-table'
import {ResourcePage} from '@/components/resource-page'
import {NoCluster} from '@/components/no-cluster'
import {useAppStore} from '@/stores/app-store'
import {useIngresses} from '@/hooks/use-k8s'
import type {IngressInfo} from '@/lib/wails'

export function IngressPage() {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const activeNamespace = useAppStore((s) => s.activeNamespace)
    const {data = [], isLoading, error, refetch} = useIngresses(
        activeCluster?.id ?? null,
        activeNamespace ?? ''
    )

    const columns = useMemo<ColumnDef<IngressInfo>[]>(
        () => [
            {
                accessorKey: 'name',
                header: t('resources.name'),
                cell: ({row}) => (
                    <span className="font-mono text-[13px]">{row.original.name}</span>
                ),
            },
            {accessorKey: 'namespace', header: t('resources.namespace')},
            {accessorKey: 'class', header: t('resources.class')},
            {
                accessorKey: 'hosts',
                header: t('resources.hosts'),
                cell: ({row}) => (row.original.hosts ?? []).join(', '),
            },
            {
                accessorKey: 'addresses',
                header: t('resources.addresses'),
                cell: ({row}) => (row.original.addresses ?? []).join(', '),
            },
            {accessorKey: 'age', header: t('resources.age')},
        ],
        [t]
    )

    if (!activeCluster) return <NoCluster/>

    return (
        <ResourcePage
            title={t('sidebar.ingress')}
            isLoading={isLoading}
            error={error}
            onRetry={() => void refetch()}
        >
            <DataTable columns={columns} data={data ?? []}/>
        </ResourcePage>
    )
}
