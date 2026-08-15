import {useMemo, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Link} from 'react-router'
import {useQuery} from '@tanstack/react-query'
import type {ColumnDef} from '@tanstack/react-table'
import {DataTable} from '@/components/tables/data-table'
import {ResourcePage} from '@/components/resource-page'
import {NoCluster} from '@/components/no-cluster'
import {useAppStore} from '@/stores/app-store'
import {
    ListCronJobs,
    ListDaemonSets,
    ListDeployments,
    ListJobs,
    ListStatefulSets,
} from '@/lib/wails'
import type {CronJobInfo, JobInfo, WorkloadInfo} from '@/lib/wails'
import {cn} from '@/lib/utils'

type WorkloadKind = 'deployments' | 'statefulsets' | 'daemonsets' | 'jobs' | 'cronjobs'

const KINDS: {value: WorkloadKind; labelKey: string}[] = [
    {value: 'deployments', labelKey: 'resources.deployments'},
    {value: 'statefulsets', labelKey: 'resources.statefulsets'},
    {value: 'daemonsets', labelKey: 'resources.daemonsets'},
    {value: 'jobs', labelKey: 'resources.jobs'},
    {value: 'cronjobs', labelKey: 'resources.cronjobs'},
]

type WorkloadData = WorkloadInfo[] | JobInfo[] | CronJobInfo[]

async function fetchWorkloads(
    kind: WorkloadKind,
    clusterId: string,
    namespace: string
): Promise<WorkloadData> {
    switch (kind) {
        case 'deployments':
            return ListDeployments(clusterId, namespace)
        case 'statefulsets':
            return ListStatefulSets(clusterId, namespace)
        case 'daemonsets':
            return ListDaemonSets(clusterId, namespace)
        case 'jobs':
            return ListJobs(clusterId, namespace)
        case 'cronjobs':
            return ListCronJobs(clusterId, namespace)
    }
}

export function WorkloadsPage() {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const activeNamespace = useAppStore((s) => s.activeNamespace)
    const [kind, setKind] = useState<WorkloadKind>('deployments')

    const clusterId = activeCluster?.id ?? null
    const namespace = activeNamespace ?? ''
    const {data, isLoading, error, refetch} = useQuery({
        queryKey: ['k8s', clusterId, 'workloads', kind, namespace],
        queryFn: () => fetchWorkloads(kind, clusterId as string, namespace),
        enabled: !!clusterId,
        retry: false,
    })

    const workloadColumns = useMemo<ColumnDef<WorkloadInfo>[]>(
        () => [
            {accessorKey: 'kind', header: t('resources.kind')},
            {
                accessorKey: 'name',
                header: t('resources.name'),
                cell: ({row}) =>
                    row.original.kind === 'Deployment' ? (
                        <Link
                            to={`/workloads/deployments/${row.original.namespace}/${row.original.name}`}
                            className="font-mono text-[13px] text-primary hover:underline"
                        >
                            {row.original.name}
                        </Link>
                    ) : (
                        <span className="font-mono text-[13px]">{row.original.name}</span>
                    ),
            },
            {accessorKey: 'namespace', header: t('resources.namespace')},
            {accessorKey: 'desired', header: t('resources.desired')},
            {accessorKey: 'ready', header: t('resources.ready')},
            {accessorKey: 'available', header: t('resources.available')},
            {accessorKey: 'image', header: t('resources.image')},
            {accessorKey: 'age', header: t('resources.age')},
        ],
        [t]
    )

    const jobColumns = useMemo<ColumnDef<JobInfo>[]>(
        () => [
            {
                accessorKey: 'name',
                header: t('resources.name'),
                cell: ({row}) => (
                    <span className="font-mono text-[13px]">{row.original.name}</span>
                ),
            },
            {accessorKey: 'namespace', header: t('resources.namespace')},
            {accessorKey: 'completions', header: t('resources.completions')},
            {accessorKey: 'duration', header: t('resources.duration')},
            {accessorKey: 'age', header: t('resources.age')},
        ],
        [t]
    )

    const cronJobColumns = useMemo<ColumnDef<CronJobInfo>[]>(
        () => [
            {
                accessorKey: 'name',
                header: t('resources.name'),
                cell: ({row}) => (
                    <span className="font-mono text-[13px]">{row.original.name}</span>
                ),
            },
            {accessorKey: 'namespace', header: t('resources.namespace')},
            {accessorKey: 'schedule', header: t('resources.schedule')},
            {
                accessorKey: 'suspend',
                header: t('resources.suspend'),
                cell: ({row}) => (row.original.suspend ? '✓' : ''),
            },
            {accessorKey: 'active', header: t('resources.active')},
            {accessorKey: 'lastSchedule', header: t('resources.lastSchedule')},
            {accessorKey: 'age', header: t('resources.age')},
        ],
        [t]
    )

    if (!activeCluster) return <NoCluster/>

    return (
        <ResourcePage
            title={t('sidebar.workloads')}
            isLoading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            actions={
                <div className="flex flex-wrap items-center gap-1 rounded-md border border-border p-1">
                    {KINDS.map((k) => (
                        <button
                            key={k.value}
                            type="button"
                            onClick={() => setKind(k.value)}
                            className={cn(
                                'rounded px-2.5 py-1 text-sm transition-colors',
                                kind === k.value
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {t(k.labelKey)}
                        </button>
                    ))}
                </div>
            }
        >
            {kind === 'jobs' ? (
                <DataTable columns={jobColumns} data={(data ?? []) as JobInfo[]}/>
            ) : kind === 'cronjobs' ? (
                <DataTable columns={cronJobColumns} data={(data ?? []) as CronJobInfo[]}/>
            ) : (
                <DataTable columns={workloadColumns} data={(data ?? []) as WorkloadInfo[]}/>
            )}
        </ResourcePage>
    )
}
