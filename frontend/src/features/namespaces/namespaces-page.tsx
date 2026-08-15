import {useMemo} from 'react'
import {useTranslation} from 'react-i18next'
import type {ColumnDef} from '@tanstack/react-table'
import {DataTable} from '@/components/tables/data-table'
import {ResourcePage} from '@/components/resource-page'
import {NoCluster} from '@/components/no-cluster'
import {Badge} from '@/components/ui/badge'
import {useAppStore} from '@/stores/app-store'
import {useNamespaces} from '@/hooks/use-k8s'
import type {NamespaceInfo} from '@/lib/wails'

export function NamespacesPage() {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const {data = [], isLoading} = useNamespaces(activeCluster?.id ?? null)

    const columns = useMemo<ColumnDef<NamespaceInfo>[]>(
        () => [
            {accessorKey: 'name', header: t('resources.name')},
            {
                accessorKey: 'status',
                header: t('resources.status'),
                cell: ({row}) => <Badge variant="outline">{row.original.status}</Badge>,
            },
            {accessorKey: 'age', header: t('resources.age')},
        ],
        [t]
    )

    if (!activeCluster) return <NoCluster/>

    return (
        <ResourcePage title={t('sidebar.namespaces')} isLoading={isLoading}>
            <DataTable columns={columns} data={data ?? []}/>
        </ResourcePage>
    )
}
