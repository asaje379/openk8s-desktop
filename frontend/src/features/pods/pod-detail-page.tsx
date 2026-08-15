import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Link, useParams} from 'react-router'
import type {ColumnDef} from '@tanstack/react-table'
import {DataTable} from '@/components/tables/data-table'
import {NoCluster} from '@/components/no-cluster'
import {Badge} from '@/components/ui/badge'
import {LogViewer} from '@/components/logs/log-viewer'
import {TerminalView} from '@/components/terminal/terminal-view'
import {useAppStore} from '@/stores/app-store'
import {useEvents, usePod, usePodYAML} from '@/hooks/use-k8s'
import {podStatusVariant} from '@/lib/status'
import {cn} from '@/lib/utils'
import type {ContainerInfo, EventInfo, PodDetail} from '@/lib/wails'

type Tab = 'overview' | 'containers' | 'logs' | 'terminal' | 'events' | 'yaml'

const TABS: {value: Tab; labelKey: string}[] = [
    {value: 'overview', labelKey: 'pod.overview'},
    {value: 'containers', labelKey: 'pod.containers'},
    {value: 'logs', labelKey: 'pod.logs'},
    {value: 'terminal', labelKey: 'pod.terminal'},
    {value: 'events', labelKey: 'pod.events'},
    {value: 'yaml', labelKey: 'pod.yaml'},
]

function Overview({pod}: {pod: PodDetail}) {
    const {t} = useTranslation()
    const rows = [
        [t('resources.namespace'), pod.namespace],
        [t('resources.status'), pod.status],
        [t('resources.node'), pod.node],
        [t('resources.ip'), pod.ip],
        [t('resources.restarts'), String(pod.restarts)],
        [t('resources.createdAt'), pod.createdAt],
    ]
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-border bg-card p-4">
                        <div className="text-xs text-muted-foreground">{label}</div>
                        <div className="mt-1 font-mono text-sm text-foreground">{value || '—'}</div>
                    </div>
                ))}
            </div>
            {pod.labels && Object.keys(pod.labels).length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-2 text-xs text-muted-foreground">{t('resources.labels')}</div>
                    <div className="flex flex-wrap gap-1.5">
                        {Object.entries(pod.labels).map(([k, v]) => (
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

function ContainersTab({containers}: {containers: ContainerInfo[]}) {
    const {t} = useTranslation()
    const columns: ColumnDef<ContainerInfo>[] = [
        {accessorKey: 'name', header: t('resources.name')},
        {accessorKey: 'image', header: t('resources.image')},
        {
            accessorKey: 'ready',
            header: t('resources.ready'),
            cell: ({row}) => (row.original.ready ? '✓' : ''),
        },
        {accessorKey: 'restartCount', header: t('resources.restarts')},
        {accessorKey: 'state', header: t('resources.state')},
    ]
    return <DataTable columns={columns} data={containers} searchable={false}/>
}

function EventsTab({clusterId, namespace, podName}: {clusterId: string; namespace: string; podName: string}) {
    const {t} = useTranslation()
    const {data = [], isLoading} = useEvents(clusterId, namespace)
    const filtered = data.filter((e) => e.object === podName)

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
    const {data, isLoading} = usePodYAML(clusterId, namespace, name)
    if (isLoading) return <div className="h-40 animate-pulse rounded-md bg-muted"/>
    return (
        <pre className="overflow-auto rounded-md border border-border bg-black p-4 font-mono text-xs text-gray-200">
            {data ?? ''}
        </pre>
    )
}

export function PodDetailPage() {
    const {t} = useTranslation()
    const {namespace = '', name = ''} = useParams()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const clusterId = activeCluster?.id ?? null
    const {data: pod, isLoading, error} = usePod(clusterId, namespace, name)
    const [tab, setTab] = useState<Tab>('overview')

    if (!activeCluster) return <NoCluster/>

    const containers = (pod?.containers ?? []).map((c) => c.name)

    return (
        <div className="flex min-h-full flex-col gap-4 p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <Link to="/pods" className="text-sm text-muted-foreground hover:text-foreground">
                        ← {t('sidebar.pods')}
                    </Link>
                    <div className="mt-1 flex items-center gap-3">
                        <h1 className="font-mono text-2xl font-semibold tracking-tight">{name}</h1>
                        {pod && <Badge variant={podStatusVariant(pod.status)}>{pod.status}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{namespace}</p>
                </div>
            </div>

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

            {isLoading ? (
                <div className="h-64 animate-pulse rounded-md bg-muted"/>
            ) : error ? (
                <p className="text-sm text-destructive">{String(error)}</p>
            ) : pod ? (
                <>
                    {tab === 'overview' && <Overview pod={pod}/>}
                    {tab === 'containers' && <ContainersTab containers={pod.containers}/>}
                    {tab === 'logs' && (
                        <LogViewer
                            clusterId={clusterId as string}
                            namespace={namespace}
                            pod={name}
                            containers={containers}
                        />
                    )}
                    {tab === 'terminal' && (
                        <TerminalView
                            clusterId={clusterId as string}
                            namespace={namespace}
                            pod={name}
                            containers={containers}
                        />
                    )}
                    {tab === 'events' && (
                        <EventsTab clusterId={clusterId as string} namespace={namespace} podName={name}/>
                    )}
                    {tab === 'yaml' && (
                        <YamlTab clusterId={clusterId as string} namespace={namespace} name={name}/>
                    )}
                </>
            ) : null}
        </div>
    )
}
