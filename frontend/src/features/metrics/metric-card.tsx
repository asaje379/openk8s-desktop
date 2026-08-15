import {useTranslation} from 'react-i18next'
import {cn} from '@/lib/utils'

interface MetricCardProps {
    label: string
    used: string
    total: string
    usedValue: number
    totalValue: number
    hasTotal?: boolean
}

export function MetricCard({
    label,
    used,
    total,
    usedValue,
    totalValue,
    hasTotal = true,
}: MetricCardProps) {
    const {t} = useTranslation()
    const percent = hasTotal && totalValue > 0 ? Math.min(100, (usedValue / totalValue) * 100) : 0

    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-1 text-lg font-semibold">
                {used}
                {hasTotal && (
                    <span className="text-sm font-normal text-muted-foreground"> / {total}</span>
                )}
            </div>
            {hasTotal ? (
                <>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className={cn(
                                'h-full rounded-full',
                                percent >= 90 ? 'bg-destructive' : 'bg-primary'
                            )}
                            style={{width: `${percent}%`}}
                        />
                    </div>
                    <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                        <span>
                            {t('metrics.used')} {Math.round(percent)}%
                        </span>
                        <span>{t('metrics.total')}</span>
                    </div>
                </>
            ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                    {t('metrics.totalsUnavailable')}
                </p>
            )}
        </div>
    )
}
