import {useMemo} from 'react'
import {useTranslation} from 'react-i18next'
import {Link} from 'react-router'
import type {ColumnDef} from '@tanstack/react-table'
import {DataTable} from '@/components/tables/data-table'
import {ResourcePage} from '@/components/resource-page'
import {NoCluster} from '@/components/no-cluster'
import {useAppStore} from '@/stores/app-store'
import {useConfigMaps} from '@/hooks/use-k8s'
import type {ConfigMapInfo} from '@/lib/wails'

export function ConfigMapsPage() {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const activeNamespace = useAppStore((s) => s.activeNamespace)
    const {data = [], isLoading, error, refetch} = useConfigMaps(
        activeCluster?.id ?? null,
        activeNamespace ?? ''
    )

    const columns = useMemo<ColumnDef<ConfigMapInfo>[]>(
        () => [
            {
                accessorKey: 'name',
                header: t('resources.name'),
                cell: ({row}) => (
                    <Link
                        to={`/configmaps/${row.original.namespace}/${row.original.name}`}
                        className="font-mono text-[13px] text-primary hover:underline"
                    >
                        {row.original.name}
                    </Link>
                ),
            },
            {accessorKey: 'namespace', header: t('resources.namespace')},
            {
                accessorKey: 'keys',
                header: t('configmap.keys'),
                cell: ({row}) => (
                    <span className="block max-w-[320px] truncate font-mono text-xs text-muted-foreground">
                        {(row.original.keys ?? []).join(', ')}
                    </span>
                ),
            },
            {accessorKey: 'age', header: t('resources.age')},
        ],
        [t]
    )

    if (!activeCluster) return <NoCluster/>

    return (
        <ResourcePage
            title={t('sidebar.configmaps')}
            isLoading={isLoading}
            error={error}
            onRetry={() => void refetch()}
        >
            <DataTable columns={columns} data={data ?? []}/>
        </ResourcePage>
    )
}
