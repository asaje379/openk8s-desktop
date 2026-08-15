import {useQuery} from '@tanstack/react-query'
import {useTranslation} from 'react-i18next'
import {GetVersion} from '@/lib/wails'
import {useAppStore} from '@/stores/app-store'
import {useClusterMetrics} from '@/hooks/use-k8s'
import {MetricCard} from '@/features/metrics/metric-card'
import {MetricsUnavailable} from '@/features/metrics/metrics-unavailable'
import {isForbiddenError, isMetricsUnavailableError} from '@/lib/errors'

export function DashboardPage() {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const {data: version} = useQuery({
        queryKey: ['version'],
        queryFn: () => GetVersion(),
    })
    const {
        data: metrics,
        isLoading: metricsLoading,
        error: metricsError,
    } = useClusterMetrics(activeCluster?.id ?? null)

    return (
        <div className="flex h-full flex-col gap-6 p-8">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">{t('dashboard.title')}</h1>
                <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-4">
                    <div className="text-sm text-muted-foreground">{t('dashboard.application')}</div>
                    <div className="mt-1 text-lg font-semibold">
                        {version?.name ?? t('common.appName')}
                    </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                    <div className="text-sm text-muted-foreground">{t('dashboard.version')}</div>
                    <div className="mt-1 text-lg font-semibold">{version?.version ?? '—'}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                    <div className="text-sm text-muted-foreground">{t('dashboard.goRuntime')}</div>
                    <div className="mt-1 text-lg font-semibold">{version?.go ?? '—'}</div>
                </div>
            </div>

            {activeCluster && (
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground">
                        {activeCluster.name}
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
                </div>
            )}
        </div>
    )
}
