import {useTranslation} from 'react-i18next'
import {ExternalLink, Loader2} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {OpenExternal} from '@/lib/wails'
import {useUpdateCheck} from '@/hooks/use-update-check'

interface UpdateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function UpdateDialog({open, onOpenChange}: UpdateDialogProps) {
    const {t} = useTranslation()
    const {data, isFetching, refetch} = useUpdateCheck()

    const update = data?.hasUpdate

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('update.title')}</DialogTitle>
                    <DialogDescription>{t('update.description')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                        <span className="text-muted-foreground">{t('update.currentVersion')}</span>
                        <span className="font-medium">{data?.currentVersion}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                        <span className="text-muted-foreground">{t('update.latestVersion')}</span>
                        <span className="font-medium">
                            {update ? data.latestVersion : t('update.upToDate')}
                        </span>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    {update ? (
                        <Button variant="outline" onClick={() => OpenExternal(data.htmlUrl)}>
                            <ExternalLink className="size-4"/>
                            {t('update.openReleasePage')}
                        </Button>
                    ) : null}
                    <Button
                        variant={update ? 'outline' : 'default'}
                        disabled={isFetching}
                        onClick={() => refetch()}
                    >
                        {isFetching ? <Loader2 className="size-4 animate-spin"/> : null}
                        {isFetching ? t('update.checking') : t('update.checkNow')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
