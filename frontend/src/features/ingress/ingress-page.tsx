import {useMemo} from 'react'
import {useTranslation} from 'react-i18next'
import type {ColumnDef} from '@tanstack/react-table'
import {DataTable} from '@/components/tables/data-table'
import {ResourcePage} from '@/components/resource-page'
import {NoCluster} from '@/components/no-cluster'
import {NamespaceSelect} from '@/components/namespace-select'
import {useAppStore} from '@/stores/app-store'
import {useIngresses, useNamespaceFilter} from '@/hooks/use-k8s'
import type {IngressInfo} from '@/lib/wails'

export function IngressPage() {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const [namespace, setNamespace] = useNamespaceFilter(activeCluster?.id ?? null)
    const {data = [], isLoading, error, refetch} = useIngresses(activeCluster?.id ?? null, namespace)

    const columns = useMemo<ColumnDef<IngressInfo>[]>(
        () => [
            {accessorKey: 'name', header: t('resources.name')},
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
            actions={<NamespaceSelect value={namespace} onChange={setNamespace}/>}
        >
            <DataTable columns={columns} data={data ?? []}/>
        </ResourcePage>
    )
}
