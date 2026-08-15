import {lazy, Suspense, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Link, useNavigate, useParams} from 'react-router'
import {toast} from 'sonner'
import {Eye, EyeOff} from 'lucide-react'
import {NoCluster} from '@/components/no-cluster'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {useAppStore} from '@/stores/app-store'
import {useApplySecret, useDeleteSecret, useSecret, useSecretYAML} from '@/hooks/use-k8s'
import {cn} from '@/lib/utils'
import type {SecretDetail} from '@/lib/wails'

const YamlEditor = lazy(() =>
    import('@/components/yaml/yaml-editor').then((m) => ({default: m.YamlEditor}))
)

type Tab = 'data' | 'yaml'

function SecretValue({value}: {value: string}) {
    const {t} = useTranslation()
    const [revealed, setRevealed] = useState(false)

    const handleReveal = () => {
        if (window.confirm(t('secret.revealWarning'))) {
            setRevealed(true)
        }
    }

    if (!revealed) {
        return (
            <Button size="sm" variant="outline" onClick={handleReveal}>
                <Eye className="size-3.5"/>
                {t('secret.reveal')}
            </Button>
        )
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="break-all font-mono text-xs whitespace-pre-wrap">{value}</span>
            <Button size="sm" variant="ghost" onClick={() => setRevealed(false)}>
                <EyeOff className="size-3.5"/>
                {t('secret.hide')}
            </Button>
        </div>
    )
}

function DataTab({secret}: {secret: SecretDetail}) {
    const {t} = useTranslation()
    const entries = Object.entries(secret.data ?? {})

    if (entries.length === 0) {
        return <p className="text-sm text-muted-foreground">{t('resources.empty')}</p>
    }

    return (
        <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            {t('secret.key')}
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            {t('secret.value')}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map(([key, value]) => (
                        <tr key={key} className="border-b border-border last:border-0 hover:bg-muted/50">
                            <td className="whitespace-nowrap px-3 py-2 align-top font-mono text-xs">{key}</td>
                            <td className="px-3 py-2 align-top">
                                <SecretValue value={value}/>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function YamlTab({
    clusterId,
    namespace,
    name,
}: {
    clusterId: string
    namespace: string
    name: string
}) {
    const {t} = useTranslation()
    const {data, isLoading} = useSecretYAML(clusterId, namespace, name)
    const apply = useApplySecret()

    if (isLoading) return <div className="h-64 animate-pulse rounded-md bg-muted"/>

    return (
        <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-muted"/>}>
            <YamlEditor
                initialValue={data ?? ''}
                isApplying={apply.isPending}
                onApply={(yaml) =>
                    apply.mutate(
                        {clusterId, namespace, name, yaml},
                        {onSuccess: () => toast.success(t('secret.applied'))}
                    )
                }
            />
        </Suspense>
    )
}

export function SecretDetailPage() {
    const {t} = useTranslation()
    const {namespace = '', name = ''} = useParams()
    const navigate = useNavigate()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const clusterId = activeCluster?.id ?? null
    const {data: secret, isLoading, error} = useSecret(clusterId, namespace, name)
    const deleteSecret = useDeleteSecret()
    const [tab, setTab] = useState<Tab>('data')

    if (!activeCluster) return <NoCluster/>

    const handleDelete = () => {
        if (!clusterId) return
        if (window.confirm(t('secret.deleteConfirm'))) {
            deleteSecret.mutate(
                {clusterId, namespace, name},
                {
                    onSuccess: () => {
                        toast.success(t('secret.deleted'))
                        void navigate('/secrets')
                    },
                }
            )
        }
    }

    return (
        <div className="flex min-h-full flex-col gap-4 p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <Link to="/secrets" className="text-sm text-muted-foreground hover:text-foreground">
                        ← {t('sidebar.secrets')}
                    </Link>
                    <div className="mt-1 flex items-center gap-3">
                        <h1 className="font-mono text-2xl font-semibold tracking-tight">{name}</h1>
                        {secret && <Badge variant="outline">{secret.type}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{namespace}</p>
                </div>
                <Button size="sm" variant="destructive" onClick={handleDelete}>
                    {t('secret.delete')}
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-md border border-border p-1">
                {(['data', 'yaml'] as Tab[]).map((tb) => (
                    <button
                        key={tb}
                        type="button"
                        onClick={() => setTab(tb)}
                        className={cn(
                            'rounded px-2.5 py-1 text-sm transition-colors',
                            tab === tb
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {t(tb === 'data' ? 'secret.data' : 'pod.yaml')}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="h-64 animate-pulse rounded-md bg-muted"/>
            ) : error ? (
                <p className="text-sm text-destructive">{String(error)}</p>
            ) : secret ? (
                <>
                    {tab === 'data' && <DataTab secret={secret}/>}
                    {tab === 'yaml' && (
                        <YamlTab clusterId={clusterId as string} namespace={namespace} name={name}/>
                    )}
                </>
            ) : null}
        </div>
    )
}
