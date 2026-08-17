import {useMemo} from 'react'
import {useTranslation} from 'react-i18next'
import {Box, Container, Cpu, Database, Layers, Network, Route, Server} from 'lucide-react'
import {NoCluster} from '@/components/no-cluster'
import {useAppStore} from '@/stores/app-store'
import {
    useClusterMetrics,
    useDaemonSets,
    useDeployments,
    useIngresses,
    useNamespaces,
    useNodes,
    usePods,
    useSavedNamespaces,
    useServices,
    useStatefulSets,
} from '@/hooks/use-k8s'
import {MetricCard} from '@/features/metrics/metric-card'
import {MetricsUnavailable} from '@/features/metrics/metrics-unavailable'
import {StatCard} from '@/features/dashboard/stat-card'
import {isForbiddenError, isMetricsUnavailableError} from '@/lib/errors'

export function DashboardPage() {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const activeNamespace = useAppStore((s) => s.activeNamespace)
    const clusterId = activeCluster?.id ?? null
    const namespace = activeNamespace ?? ''

    const {
        data: metrics,
        isLoading: metricsLoading,
        error: metricsError,
    } = useClusterMetrics(clusterId)

    const pods = usePods(clusterId, namespace)
    const deployments = useDeployments(clusterId, namespace)
    const statefulsets = useStatefulSets(clusterId, namespace)
    const daemonsets = useDaemonSets(clusterId, namespace)
    const services = useServices(clusterId, namespace)
    const ingresses = useIngresses(clusterId, namespace)
    const nodes = useNodes(clusterId)
    const namespaces = useNamespaces(clusterId)
    const savedNamespaces = useSavedNamespaces(clusterId)

    const podRunning = useMemo(
        () => (pods.data ?? []).filter((p) => p.status === 'Running').length,
        [pods.data]
    )
    const nodeReady = useMemo(
        () => (nodes.data ?? []).filter((n) => n.status === 'Ready').length,
        [nodes.data]
    )
    const readyOf = (items: {ready: number; desired: number}[]) => {
        const ready = items.reduce((sum, i) => sum + i.ready, 0)
        const desired = items.reduce((sum, i) => sum + i.desired, 0)
        return {ready, desired}
    }
    const deploymentsReady = readyOf(deployments.data ?? [])
    const statefulSetsReady = readyOf(statefulsets.data ?? [])
    const daemonSetsReady = readyOf(daemonsets.data ?? [])

    const scopesLoading =
        pods.isLoading ||
        deployments.isLoading ||
        statefulsets.isLoading ||
        daemonsets.isLoading ||
        services.isLoading ||
        ingresses.isLoading

    if (!activeCluster) return <NoCluster/>

    return (
        <div className="flex h-full flex-col gap-6 p-8">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">{t('dashboard.title')}</h1>
                <p className="text-sm text-muted-foreground">
                    {activeCluster.name}
                    {activeNamespace && <span> · {activeNamespace}</span>}
                </p>
            </div>

            <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground">
                    {t('dashboard.resources')}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        icon={Box}
                        label={t('sidebar.pods')}
                        value={pods.data?.length ?? 0}
                        detail={t('dashboard.runningCount', {count: podRunning})}
                        to="/pods"
                        loading={scopesLoading}
                    />
                    <StatCard
                        icon={Container}
                        label={t('sidebar.deployments')}
                        value={deployments.data?.length ?? 0}
                        detail={t('dashboard.replicasReady', {
                            ready: deploymentsReady.ready,
                            desired: deploymentsReady.desired,
                        })}
                        to="/workloads"
                        loading={scopesLoading}
                    />
                    <StatCard
                        icon={Database}
                        label={t('sidebar.statefulSets')}
                        value={statefulsets.data?.length ?? 0}
                        detail={t('dashboard.replicasReady', {
                            ready: statefulSetsReady.ready,
                            desired: statefulSetsReady.desired,
                        })}
                        to="/workloads"
                        loading={scopesLoading}
                    />
                    <StatCard
                        icon={Cpu}
                        label={t('sidebar.daemonSets')}
                        value={daemonsets.data?.length ?? 0}
                        detail={t('dashboard.replicasReady', {
                            ready: daemonSetsReady.ready,
                            desired: daemonSetsReady.desired,
                        })}
                        to="/workloads"
                        loading={scopesLoading}
                    />
                    <StatCard
                        icon={Network}
                        label={t('sidebar.services')}
                        value={services.data?.length ?? 0}
                        to="/services"
                        loading={scopesLoading}
                    />
                    <StatCard
                        icon={Route}
                        label={t('sidebar.ingress')}
                        value={ingresses.data?.length ?? 0}
                        to="/ingress"
                        loading={scopesLoading}
                    />
                    <StatCard
                        icon={Server}
                        label={t('sidebar.nodes')}
                        value={nodes.data?.length ?? 0}
                        detail={t('dashboard.readyCount', {count: nodeReady})}
                        to="/nodes"
                        loading={nodes.isLoading}
                    />
                    <StatCard
                        icon={Layers}
                        label={t('sidebar.namespaces')}
                        value={namespaces.data?.length ?? savedNamespaces.data?.length ?? 0}
                        to="/namespaces"
                        loading={namespaces.isLoading || savedNamespaces.isLoading}
                    />
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground">
                    {t('dashboard.cluster')}
                </h2>
                {metricsLoading ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="h-32 animate-pulse rounded-xl bg-muted"/>
                        <div className="h-32 animate-pulse rounded-xl bg-muted"/>
                    </div>
                ) : metricsError && isMetricsUnavailableError(metricsError) ? (
                    <MetricsUnavailable/>
                ) : metricsError && isForbiddenError(metricsError) ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-8 text-center">
                        <h2 className="text-base font-semibold">{t('resources.forbidden')}</h2>
                        <p className="max-w-md text-sm text-muted-foreground">
                            {t('resources.forbiddenDescription')}
                        </p>
                    </div>
                ) : metricsError ? (
                    <p className="text-sm text-destructive">{String(metricsError)}</p>
                ) : metrics ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <MetricCard
                            label={t('metrics.cpu')}
                            used={metrics.cpuUsed}
                            total={metrics.cpuTotal}
                            usedValue={metrics.cpuUsedMillis}
                            totalValue={metrics.cpuTotalMillis}
                            hasTotal={metrics.totalsAvailable}
                        />
                        <MetricCard
                            label={t('metrics.memory')}
                            used={metrics.memoryUsed}
                            total={metrics.memoryTotal}
                            usedValue={metrics.memoryUsedBytes}
                            totalValue={metrics.memoryTotalBytes}
                            hasTotal={metrics.totalsAvailable}
                        />
                    </div>
                ) : null}
            </section>
        </div>
    )
}