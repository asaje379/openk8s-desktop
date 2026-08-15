import {useQuery} from '@tanstack/react-query'
import {useTranslation} from 'react-i18next'
import {Health} from '@/lib/wails'

export function ClustersPage() {
    const {t} = useTranslation()
    const {data: health} = useQuery({
        queryKey: ['health'],
        queryFn: () => Health(),
    })

    return (
        <div className="flex h-full flex-col gap-6 p-8">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">{t('clusters.title')}</h1>
                <p className="text-sm text-muted-foreground">{t('clusters.subtitle')}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                {t('clusters.backendStatus')}:{' '}
                <span className="font-medium text-foreground">{health ?? '…'}</span>
            </div>
        </div>
    )
}
