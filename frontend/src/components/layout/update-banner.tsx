import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Download, Loader2, RefreshCw, RotateCcw, X} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {ApplyUpdate, DownloadUpdate} from '@/lib/wails'
import {useUpdateCheck} from '@/hooks/use-update-check'
import {registerUpdateEvents, useUpdateStore} from '@/stores/update-store'

const DISMISS_KEY = 'dismissedUpdateVersion'

export function UpdateBanner() {
    const {t} = useTranslation()
    const {data} = useUpdateCheck()
    const phase = useUpdateStore((s) => s.phase)
    const percent = useUpdateStore((s) => s.percent)
    const error = useUpdateStore((s) => s.error)
    const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY))

    useEffect(() => registerUpdateEvents(), [])

    if (!data?.hasUpdate || (data.latestVersion === dismissed && phase === 'idle')) {
        return null
    }

    const download = () => {
        useUpdateStore.getState().startDownload()
        DownloadUpdate().catch((err: Error) => {
            useUpdateStore.getState().applyEvent({phase: 'error', error: err.message})
        })
    }

    const apply = () => {
        useUpdateStore.getState().setPhase('applying')
        ApplyUpdate().catch((err: Error) => {
            useUpdateStore.getState().applyEvent({phase: 'error', error: err.message})
        })
    }

    return (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-primary/5 px-4 py-1.5 text-sm">
            <p className="flex min-w-0 items-center gap-2 text-foreground">
                <span className="size-2 shrink-0 rounded-full bg-primary"/>
                <span className="truncate">{t('update.available', {version: data.latestVersion})}</span>
            </p>
            <div className="flex shrink-0 items-center gap-2">
                {data.supportsAutoUpdate ? (
                    <>
                        {phase === 'idle' && (
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={download}>
                                <Download className="size-3.5"/>
                                {t('update.download')}
                            </Button>
                        )}
                        {phase === 'downloading' && (
                            <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="size-3.5 animate-spin"/>
                                {percent > 0
                                    ? t('update.downloading') + ' ' + percent + '%'
                                    : t('update.downloading')}
                            </span>
                        )}
                        {phase === 'verifying' && (
                            <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="size-3.5 animate-spin"/>
                                {t('update.verifying')}
                            </span>
                        )}
                        {phase === 'ready' && (
                            <Button size="sm" className="gap-1.5" onClick={apply}>
                                <RotateCcw className="size-3.5"/>
                                {t('update.restartToApply')}
                            </Button>
                        )}
                        {phase === 'applying' && (
                            <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="size-3.5 animate-spin"/>
                                {t('update.applying')}
                            </span>
                        )}
                        {phase === 'error' && (
                            <>
                                <span className="max-w-56 truncate text-xs text-destructive">
                                    {error}
                                </span>
                                <Button variant="outline" size="sm" className="gap-1.5" onClick={download}>
                                    <RefreshCw className="size-3.5"/>
                                    {t('update.retry')}
                                </Button>
                            </>
                        )}
                    </>
                ) : null}
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={t('update.dismiss')}
                    onClick={() => {
                        localStorage.setItem(DISMISS_KEY, data.latestVersion)
                        setDismissed(data.latestVersion)
                    }}
                >
                    <X className="size-3.5"/>
                </Button>
            </div>
        </div>
    )
}