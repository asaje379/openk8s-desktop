import {useQuery} from '@tanstack/react-query'
import {useTranslation} from 'react-i18next'
import {GetVersion} from '@/lib/wails'

export function DashboardPage() {
    const {t} = useTranslation()
    const {data: version} = useQuery({
        queryKey: ['version'],
        queryFn: () => GetVersion(),
    })

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
        </div>
    )
}
