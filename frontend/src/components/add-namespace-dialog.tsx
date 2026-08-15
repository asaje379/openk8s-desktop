import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {useAppStore} from '@/stores/app-store'
import {useAddNamespace} from '@/hooks/use-k8s'

interface AddNamespaceDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onAdded?: (namespace: string) => void
}

export function AddNamespaceDialog({open, onOpenChange, onAdded}: AddNamespaceDialogProps) {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const addNamespace = useAddNamespace()
    const [name, setName] = useState('')

    const clusterId = activeCluster?.id

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('resources.addNamespace')}</DialogTitle>
                    <DialogDescription>{t('resources.addNamespaceDescription')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="namespace">{t('resources.namespace')}</Label>
                    <Input
                        id="namespace"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="my-app"
                        autoFocus
                    />
                </div>
                <div className="flex justify-end">
                    <Button
                        disabled={!name.trim() || !clusterId || addNamespace.isPending}
                        onClick={() =>
                            addNamespace.mutate(
                                {clusterId: clusterId as string, namespace: name.trim()},
                                {
                                    onSuccess: () => {
                                        setName('')
                                        onOpenChange(false)
                                        onAdded?.(name.trim())
                                    },
                                }
                            )
                        }
                    >
                        {t('resources.add')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
