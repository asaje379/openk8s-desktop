import {useMemo, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Link} from 'react-router'
import {toast} from 'sonner'
import {RefreshCw, Trash2} from 'lucide-react'
import {useQuery} from '@tanstack/react-query'
import type {ColumnDef} from '@tanstack/react-table'
import {DataTable} from '@/components/tables/data-table'
import {ResourcePage} from '@/components/resource-page'
import {NoCluster} from '@/components/no-cluster'
import {Button} from '@/components/ui/button'
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip'
import {useAppStore} from '@/stores/app-store'
import {
    ListCronJobs,
    ListDaemonSets,
    ListDeployments,
    ListJobs,
    ListStatefulSets,
} from '@/lib/wails'
import type {CronJobInfo, JobInfo, WorkloadInfo} from '@/lib/wails'
import {
    useDeleteDaemonSet,
    useDeleteDeployment,
    useDeleteStatefulSet,
    useRestartDaemonSet,
    useRestartDeployment,
    useRestartStatefulSet,
} from '@/hooks/use-k8s'
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

function WorkloadActions({
    workload,
    restartPending,
    deletePending,
    onRestart,
    onDelete,
}: {
    workload: WorkloadInfo
    restartPending: boolean
    deletePending: boolean
    onRestart: (w: WorkloadInfo) => void
    onDelete: (w: WorkloadInfo) => void
}) {
    const {t} = useTranslation()
    return (
        <div className="flex items-center justify-end gap-1">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        disabled={restartPending}
                        onClick={() => onRestart(workload)}
                    >
                        <RefreshCw className="size-3.5"/>
                        <span className="sr-only">{t('deployment.restart')}</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{t('deployment.restart')}</TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive hover:text-destructive"
                        disabled={deletePending}
                        onClick={() => onDelete(workload)}
                    >
                        <Trash2 className="size-3.5"/>
                        <span className="sr-only">{t('deployment.delete')}</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{t('deployment.delete')}</TooltipContent>
            </Tooltip>
        </div>
    )
}

export function WorkloadsPage() {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const activeNamespace = useAppStore((s) => s.activeNamespace)
    const [kind, setKind] = useState<WorkloadKind>('deployments')

    const clusterId = activeCluster?.id ?? null
    const namespace = activeNamespace ?? ''
    const restartDeployment = useRestartDeployment()
    const deleteDeployment = useDeleteDeployment()
    const restartStatefulSet = useRestartStatefulSet()
    const deleteStatefulSet = useDeleteStatefulSet()
    const restartDaemonSet = useRestartDaemonSet()
    const deleteDaemonSet = useDeleteDaemonSet()
    const {data, isLoading, error, refetch} = useQuery({
        queryKey: ['k8s', clusterId, 'workloads', kind, namespace],
        queryFn: () => fetchWorkloads(kind, clusterId as string, namespace),
        enabled: !!clusterId,
        retry: false,
    })

    const handleRestart = (w: WorkloadInfo) => {
        if (!clusterId) return
        if (!window.confirm(t('deployment.restartConfirm'))) return
        const opts = {
            onSuccess: () => toast.success(t('deployment.restarted')),
            onError: (e: unknown) => toast.error(String(e)),
        }
        switch (w.kind) {
            case 'Deployment':
                restartDeployment.mutate({clusterId, namespace: w.namespace, name: w.name}, opts)
                break
            case 'StatefulSet':
                restartStatefulSet.mutate({clusterId, namespace: w.namespace, name: w.name}, opts)
                break
            case 'DaemonSet':
                restartDaemonSet.mutate({clusterId, namespace: w.namespace, name: w.name}, opts)
                break
        }
    }

    const handleDelete = (w: WorkloadInfo) => {
        if (!clusterId) return
        if (!window.confirm(t('deployment.deleteConfirm'))) return
        const opts = {
            onSuccess: () => toast.success(t('deployment.deleted')),
            onError: (e: unknown) => toast.error(String(e)),
        }
        switch (w.kind) {
            case 'Deployment':
                deleteDeployment.mutate({clusterId, namespace: w.namespace, name: w.name}, opts)
                break
            case 'StatefulSet':
                deleteStatefulSet.mutate({clusterId, namespace: w.namespace, name: w.name}, opts)
                break
            case 'DaemonSet':
                deleteDaemonSet.mutate({clusterId, namespace: w.namespace, name: w.name}, opts)
                break
        }
    }

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
            {
                accessorKey: 'actions',
                header: '',
                cell: ({row}) => (
                    <WorkloadActions
                        workload={row.original}
                        restartPending={
                            restartDeployment.isPending ||
                            restartStatefulSet.isPending ||
                            restartDaemonSet.isPending
                        }
                        deletePending={
                            deleteDeployment.isPending ||
                            deleteStatefulSet.isPending ||
                            deleteDaemonSet.isPending
                        }
                        onRestart={handleRestart}
                        onDelete={handleDelete}
                    />
                ),
            },
        ],
        [t, handleRestart, handleDelete, restartDeployment.isPending, restartStatefulSet.isPending, restartDaemonSet.isPending, deleteDeployment.isPending, deleteStatefulSet.isPending, deleteDaemonSet.isPending]
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
