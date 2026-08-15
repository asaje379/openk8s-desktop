import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Plus} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {TestConnection} from '@/lib/wails'
import type {Cluster, ConnectionStatus} from '@/lib/wails'
import {useClusters, useContexts, useRemoveCluster, useSwitchContext} from './use-clusters'
import {AddClusterDialog} from './add-cluster-dialog'

const selectClassName =
    'flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

function ClusterCard({cluster}: {cluster: Cluster}) {
    const {t} = useTranslation()
    const removeCluster = useRemoveCluster()
    const switchContext = useSwitchContext()
    const {data: contexts = []} = useContexts(cluster.id)

    const [status, setStatus] = useState<ConnectionStatus | null>(null)
    const [testing, setTesting] = useState(false)

    const handleTest = async () => {
        setTesting(true)
        setStatus(null)
        try {
            setStatus(await TestConnection(cluster.id))
        } catch (err) {
            setStatus({connected: false, server: '', version: '', message: String(err)})
        } finally {
            setTesting(false)
        }
    }

    const handleRemove = () => {
        if (window.confirm(t('clusters.removeConfirm'))) {
            removeCluster.mutate(cluster.id)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="truncate">{cluster.name}</CardTitle>
                    {status &&
                        (status.connected ? (
                            <Badge variant="success">{t('clusters.connected')}</Badge>
                        ) : (
                            <Badge variant="destructive">{t('clusters.disconnected')}</Badge>
                        ))}
                </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <div className="text-muted-foreground">
                    {t('clusters.server')}:{' '}
                    <span className="text-foreground">{cluster.server}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{t('clusters.context')}:</span>
                    {contexts.length > 0 ? (
                        <select
                            className={selectClassName}
                            value={cluster.currentContext}
                            onChange={(e) =>
                                switchContext.mutate({id: cluster.id, context: e.target.value})
                            }
                        >
                            {contexts.map((c) => (
                                <option key={c.name} value={c.name}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <span className="text-foreground">{cluster.currentContext}</span>
                    )}
                </div>
                {status && !status.connected && (
                    <p className="text-xs text-destructive">{status.message}</p>
                )}
                {status?.connected && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {t('clusters.testSuccess', {version: status.version})}
                    </p>
                )}
            </CardContent>
            <CardFooter className="gap-2">
                <Button size="sm" variant="outline" onClick={handleTest} disabled={testing}>
                    {testing ? t('clusters.testing') : t('clusters.testConnection')}
                </Button>
                <Button size="sm" variant="destructive" onClick={handleRemove}>
                    {t('clusters.remove')}
                </Button>
            </CardFooter>
        </Card>
    )
}

export function ClustersPage() {
    const {t} = useTranslation()
    const {data: clusters, isLoading, isError, refetch} = useClusters()
    const list = clusters ?? []
    const [open, setOpen] = useState(false)

    return (
        <div className="flex h-full flex-col gap-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">{t('clusters.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('clusters.subtitle')}</p>
                </div>
                <Button onClick={() => setOpen(true)}>
                    <Plus className="size-4"/>
                    {t('clusters.addCluster')}
                </Button>
            </div>

            {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-muted"/>
                    ))}
                </div>
            ) : isError ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                    <h2 className="text-lg font-semibold">{t('error.title')}</h2>
                    <Button variant="outline" onClick={() => void refetch()}>
                        {t('error.retry')}
                    </Button>
                </div>
            ) : list.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                    <h2 className="text-lg font-semibold">{t('clusters.empty')}</h2>
                    <p className="text-sm text-muted-foreground">{t('clusters.emptyDescription')}</p>
                    <Button className="mt-2" onClick={() => setOpen(true)}>
                        <Plus className="size-4"/>
                        {t('clusters.addCluster')}
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((cluster) => (
                        <ClusterCard key={cluster.id} cluster={cluster}/>
                    ))}
                </div>
            )}

            <AddClusterDialog open={open} onOpenChange={setOpen}/>
        </div>
    )
}
