import {useMemo} from 'react'
import {useTranslation} from 'react-i18next'
import type {ColumnDef} from '@tanstack/react-table'
import {DataTable} from '@/components/tables/data-table'
import {ResourcePage} from '@/components/resource-page'
import {NoCluster} from '@/components/no-cluster'
import {NamespaceSelect} from '@/components/namespace-select'
import {Badge} from '@/components/ui/badge'
import {useAppStore} from '@/stores/app-store'
import {useNamespaceFilter, useServices} from '@/hooks/use-k8s'
import type {ServiceInfo} from '@/lib/wails'

export function ServicesPage() {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const [namespace, setNamespace] = useNamespaceFilter(activeCluster?.id ?? null)
    const {data = [], isLoading, error, refetch} = useServices(activeCluster?.id ?? null, namespace)

    const columns = useMemo<ColumnDef<ServiceInfo>[]>(
        () => [
            {accessorKey: 'name', header: t('resources.name')},
            {accessorKey: 'namespace', header: t('resources.namespace')},
            {
                accessorKey: 'type',
                header: t('resources.type'),
                cell: ({row}) => <Badge variant="outline">{row.original.type}</Badge>,
            },
            {accessorKey: 'clusterIP', header: t('resources.clusterIp')},
            {accessorKey: 'externalIP', header: t('resources.externalIp')},
            {accessorKey: 'ports', header: t('resources.ports')},
            {accessorKey: 'age', header: t('resources.age')},
        ],
        [t]
    )

    if (!activeCluster) return <NoCluster/>

    return (
        <ResourcePage
            title={t('sidebar.services')}
            isLoading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            actions={<NamespaceSelect value={namespace} onChange={setNamespace}/>}
        >
            <DataTable columns={columns} data={data ?? []}/>
        </ResourcePage>
    )
}
