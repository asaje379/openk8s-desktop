import {useTranslation} from 'react-i18next'
import {toast} from 'sonner'
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import type {KubeContext} from '@/lib/wails'
import {useImportLocalCluster} from './use-clusters'

export interface LocalContextItem {
    path: string
    context: KubeContext
}

interface ImportLocalClustersDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    contexts: LocalContextItem[]
}

export function ImportLocalClustersDialog({open, onOpenChange, contexts}: ImportLocalClustersDialogProps) {
    const {t} = useTranslation()
    const importLocal = useImportLocalCluster()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>{t('clusters.importTitle')}</DialogTitle>
                    <DialogDescription>{t('clusters.importDescription')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    {contexts.map(({path, context}) => (
                        <div
                            key={`${path}|${context.name}`}
                            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                        >
                            <div className="min-w-0">
                                <div className="truncate text-sm font-medium">{context.name}</div>
                                <div className="truncate text-xs text-muted-foreground">
                                    {context.server || path}
                                </div>
                            </div>
                            <Button
                                size="sm"
                                disabled={importLocal.isPending}
                                onClick={() =>
                                    importLocal.mutate(
                                        {path, context: context.name, name: context.name},
                                        {
                                            onSuccess: () => toast.success(t('clusters.importSuccess')),
                                        }
                                    )
                                }
                            >
                                {t('clusters.import')}
                            </Button>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
