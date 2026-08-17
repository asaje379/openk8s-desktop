import {lazy, Suspense, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Link, useNavigate, useParams} from 'react-router'
import {toast} from 'sonner'
import {RefreshCw, Trash2} from 'lucide-react'
import type {ColumnDef} from '@tanstack/react-table'
import {DataTable} from '@/components/tables/data-table'
import {NoCluster} from '@/components/no-cluster'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {LogViewer} from '@/components/logs/log-viewer'
import {useAppStore} from '@/stores/app-store'
import {
    useApplyDeployment,
    useDeleteDeployment,
    useDeployment,
    useDeploymentPods,
    useDeploymentYAML,
    useEvents,
    useRestartDeployment,
    useScaleDeployment,
} from '@/hooks/use-k8s'
import {podStatusVariant} from '@/lib/status'
import {cn} from '@/lib/utils'
import type {DeploymentDetail, EventInfo, PodInfo} from '@/lib/wails'

const YamlEditor = lazy(() =>
    import('@/components/yaml/yaml-editor').then((m) => ({default: m.YamlEditor}))
)

type Tab = 'overview' | 'pods' | 'logs' | 'events' | 'yaml'

const TABS: {value: Tab; labelKey: string}[] = [
    {value: 'overview', labelKey: 'pod.overview'},
    {value: 'pods', labelKey: 'sidebar.pods'},
    {value: 'logs', labelKey: 'pod.logs'},
    {value: 'events', labelKey: 'pod.events'},
    {value: 'yaml', labelKey: 'pod.yaml'},
]

function Overview({
    clusterId,
    namespace,
    name,
    deployment,
}: {
    clusterId: string
    namespace: string
    name: string
    deployment: DeploymentDetail
}) {
    const {t} = useTranslation()
    const scale = useScaleDeployment()
    const [replicas, setReplicas] = useState(deployment.desired)

    const rows = [
        [t('resources.namespace'), deployment.namespace],
        [t('resources.replicas'), `${deployment.ready}/${deployment.desired}`],
        [t('resources.available'), String(deployment.available)],
        [t('resources.image'), deployment.image],
        [t('resources.age'), deployment.age],
    ]
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-border bg-card p-4">
                        <div className="text-xs text-muted-foreground">{label}</div>
                        <div className="mt-1 break-all font-mono text-sm text-foreground">
                            {value || '—'}
                        </div>
                    </div>
                ))}
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 text-xs text-muted-foreground">{t('resources.scale')}</div>
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        className="w-24"
                        min={0}
                        value={replicas}
                        onChange={(e) => setReplicas(Math.max(0, Number(e.target.value)))}
                    />
                    <Button
                        size="sm"
                        disabled={scale.isPending}
                        onClick={() =>
                            scale.mutate(
                                {clusterId, namespace, name, replicas},
                                {onSuccess: () => toast.success(t('resources.scaled'))}
                            )
                        }
                    >
                        {t('resources.apply')}
                    </Button>
                </div>
            </div>
            {deployment.selector && Object.keys(deployment.selector).length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-2 text-xs text-muted-foreground">{t('resources.selector')}</div>
                    <div className="flex flex-wrap gap-1.5">
                        {Object.entries(deployment.selector).map(([k, v]) => (
                            <Badge key={k} variant="outline">
                                {k}={v}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function PodsTab({pods}: {pods: PodInfo[]}) {
    const {t} = useTranslation()
    const columns: ColumnDef<PodInfo>[] = [
        {
            accessorKey: 'name',
            header: t('resources.name'),
            cell: ({row}) => (
                <Link
                    to={`/pods/${row.original.namespace}/${row.original.name}`}
                    className="font-mono text-[13px] text-primary hover:underline"
                >
                    {row.original.name}
                </Link>
            ),
        },
        {
            accessorKey: 'status',
            header: t('resources.status'),
            cell: ({row}) => (
                <Badge variant={podStatusVariant(row.original.status)}>{row.original.status}</Badge>
            ),
        },
        {accessorKey: 'ready', header: t('resources.ready')},
        {accessorKey: 'restarts', header: t('resources.restarts')},
        {accessorKey: 'node', header: t('resources.node')},
        {accessorKey: 'age', header: t('resources.age')},
    ]
    return <DataTable columns={columns} data={pods} searchable={false}/>
}

function EventsTab({clusterId, namespace, name}: {clusterId: string; namespace: string; name: string}) {
    const {t} = useTranslation()
    const {data = [], isLoading} = useEvents(clusterId, namespace)
    const filtered = data.filter((e) => e.object === name)

    const columns: ColumnDef<EventInfo>[] = [
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
        {accessorKey: 'message', header: t('resources.message')},
        {accessorKey: 'count', header: t('resources.count')},
        {accessorKey: 'age', header: t('resources.age')},
    ]

    if (isLoading) return <div className="h-40 animate-pulse rounded-md bg-muted"/>
    return <DataTable columns={columns} data={filtered} searchable={false}/>
}

function YamlTab({clusterId, namespace, name}: {clusterId: string; namespace: string; name: string}) {
    const {t} = useTranslation()
    const {data, isLoading} = useDeploymentYAML(clusterId, namespace, name)
    const apply = useApplyDeployment()

    if (isLoading) return <div className="h-40 animate-pulse rounded-md bg-muted"/>

    return (
        <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-muted"/>}>
            <YamlEditor
                initialValue={data ?? ''}
                isApplying={apply.isPending}
                onApply={(yaml) =>
                    apply.mutate(
                        {clusterId, namespace, name, yaml},
                        {onSuccess: () => toast.success(t('deployment.applied'))}
                    )
                }
            />
        </Suspense>
    )
}

export function DeploymentDetailPage() {
    const {t} = useTranslation()
    const {namespace = '', name = ''} = useParams()
    const navigate = useNavigate()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const clusterId = activeCluster?.id ?? null
    const {data: deployment, isLoading, error} = useDeployment(clusterId, namespace, name)
    const {data: pods = []} = useDeploymentPods(clusterId, namespace, name)
    const restart = useRestartDeployment()
    const deleteDeployment = useDeleteDeployment()
    const [tab, setTab] = useState<Tab>('overview')

    if (!activeCluster) return <NoCluster/>

    const containers = deployment?.containers ?? []

    const handleRestart = () => {
        if (!clusterId) return
        if (window.confirm(t('deployment.restartConfirm'))) {
            restart.mutate(
                {clusterId, namespace, name},
                {onSuccess: () => toast.success(t('deployment.restarted'))}
            )
        }
    }

    const handleDelete = () => {
        if (!clusterId) return
        if (window.confirm(t('deployment.deleteConfirm'))) {
            deleteDeployment.mutate(
                {clusterId, namespace, name},
                {
                    onSuccess: () => {
                        toast.success(t('deployment.deleted'))
                        void navigate('/workloads')
                    },
                }
            )
        }
    }

    return (
        <div className="flex min-h-full flex-col gap-4 p-8">
            <div>
                <Link to="/workloads" className="text-sm text-muted-foreground hover:text-foreground">
                    ← {t('sidebar.workloads')}
                </Link>
                <div className="mt-1 flex items-center gap-3">
                    <h1 className="font-mono text-2xl font-semibold tracking-tight">{name}</h1>
                    {deployment && (
                        <Badge variant={deployment.ready === deployment.desired ? 'success' : 'warning'}>
                            {deployment.ready}/{deployment.desired}
                        </Badge>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">{namespace}</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1 rounded-md border border-border p-1">
                    {TABS.map((tb) => (
                        <button
                            key={tb.value}
                            type="button"
                            onClick={() => setTab(tb.value)}
                            className={cn(
                                'rounded px-2.5 py-1 text-sm transition-colors',
                                tab === tb.value
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {t(tb.labelKey)}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRestart}
                        disabled={restart.isPending}
                    >
                        <RefreshCw className="size-4"/>
                        {t('deployment.restart')}
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleteDeployment.isPending}
                    >
                        <Trash2 className="size-4"/>
                        {t('deployment.delete')}
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="h-64 animate-pulse rounded-md bg-muted"/>
            ) : error ? (
                <p className="text-sm text-destructive">{String(error)}</p>
            ) : deployment ? (
                <>
                    {tab === 'overview' && (
                        <Overview
                            clusterId={clusterId as string}
                            namespace={namespace}
                            name={name}
                            deployment={deployment}
                        />
                    )}
                    {tab === 'pods' && <PodsTab pods={pods}/>}
                    {tab === 'logs' && (
                        <LogViewer
                            clusterId={clusterId as string}
                            namespace={namespace}
                            deployment={name}
                            containers={containers}
                        />
                    )}
                    {tab === 'events' && (
                        <EventsTab clusterId={clusterId as string} namespace={namespace} name={name}/>
                    )}
                    {tab === 'yaml' && (
                        <YamlTab clusterId={clusterId as string} namespace={namespace} name={name}/>
                    )}
                </>
            ) : null}
        </div>
    )
}
