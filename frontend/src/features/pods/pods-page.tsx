import {useMemo} from 'react'
import {useTranslation} from 'react-i18next'
import type {ColumnDef} from '@tanstack/react-table'
import {DataTable} from '@/components/tables/data-table'
import {ResourcePage} from '@/components/resource-page'
import {NoCluster} from '@/components/no-cluster'
import {NamespaceSelect} from '@/components/namespace-select'
import {Badge} from '@/components/ui/badge'
import {useAppStore} from '@/stores/app-store'
import {useNamespaceFilter, usePods} from '@/hooks/use-k8s'
import type {PodInfo} from '@/lib/wails'

function podStatusVariant(status: string): 'success' | 'destructive' | 'secondary' | 'outline' {
    switch (status) {
        case 'Running':
            return 'success'
        case 'Failed':
            return 'destructive'
        case 'Pending':
            return 'secondary'
        default:
            return 'outline'
    }
}

export function PodsPage() {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const [namespace, setNamespace] = useNamespaceFilter(activeCluster?.id ?? null)
    const {data = [], isLoading, error, refetch} = usePods(activeCluster?.id ?? null, namespace)

    const columns = useMemo<ColumnDef<PodInfo>[]>(
        () => [
            {accessorKey: 'name', header: t('resources.name')},
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
            actions={<NamespaceSelect value={namespace} onChange={setNamespace}/>}
        >
            <DataTable columns={columns} data={data ?? []}/>
        </ResourcePage>
    )
}
