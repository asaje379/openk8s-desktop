import {useTranslation} from 'react-i18next'
import {Gauge} from 'lucide-react'

export function MetricsUnavailable() {
    const {t} = useTranslation()
    return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-8 text-center">
            <Gauge className="size-8 text-muted-foreground"/>
            <h2 className="text-base font-semibold">{t('metrics.unavailable')}</h2>
            <p className="max-w-md text-sm text-muted-foreground">
                {t('metrics.unavailableDescription')}
            </p>
        </div>
    )
}
