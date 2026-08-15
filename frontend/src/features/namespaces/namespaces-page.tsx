import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Plus, Trash2} from 'lucide-react'
import {ResourcePage} from '@/components/resource-page'
import {NoCluster} from '@/components/no-cluster'
import {Button} from '@/components/ui/button'
import {useAppStore} from '@/stores/app-store'
import {useRemoveNamespace, useSavedNamespaces} from '@/hooks/use-k8s'
import {AddNamespaceDialog} from '@/components/add-namespace-dialog'

export function NamespacesPage() {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const {data: saved = [], isLoading} = useSavedNamespaces(activeCluster?.id ?? null)
    const removeNamespace = useRemoveNamespace()
    const [addOpen, setAddOpen] = useState(false)

    if (!activeCluster) return <NoCluster/>

    return (
        <ResourcePage
            title={t('sidebar.namespaces')}
            isLoading={isLoading}
            actions={
                <Button onClick={() => setAddOpen(true)}>
                    <Plus className="size-4"/>
                    {t('resources.addNamespace')}
                </Button>
            }
        >
            {saved.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                    <p className="max-w-md text-sm text-muted-foreground">
                        {t('resources.addNamespaceHint')}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {saved.map((ns) => (
                        <div
                            key={ns}
                            className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                        >
                            <span className="text-sm font-medium">{ns}</span>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                    removeNamespace.mutate({clusterId: activeCluster.id, namespace: ns})
                                }
                                title={t('clusters.remove')}
                            >
                                <Trash2 className="size-4 text-muted-foreground"/>
                                <span className="sr-only">{t('clusters.remove')}</span>
                            </Button>
                        </div>
                    ))}
                </div>
            )}
            <AddNamespaceDialog open={addOpen} onOpenChange={setAddOpen}/>
        </ResourcePage>
    )
}
