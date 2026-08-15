import {lazy, Suspense, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Link, useNavigate, useParams} from 'react-router'
import {toast} from 'sonner'
import {NoCluster} from '@/components/no-cluster'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {useAppStore} from '@/stores/app-store'
import {useApplyConfigMap, useConfigMap, useConfigMapYAML, useDeleteConfigMap} from '@/hooks/use-k8s'
import {cn} from '@/lib/utils'
import type {ConfigMapDetail} from '@/lib/wails'

const YamlEditor = lazy(() =>
    import('@/components/yaml/yaml-editor').then((m) => ({default: m.YamlEditor}))
)

type Tab = 'data' | 'yaml'

function DataTab({configMap}: {configMap: ConfigMapDetail}) {
    const {t} = useTranslation()
    const entries = Object.entries(configMap.data ?? {})

    if (entries.length === 0) {
        return <p className="text-sm text-muted-foreground">{t('resources.empty')}</p>
    }

    return (
        <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            {t('configmap.key')}
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            {t('configmap.value')}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map(([key, value]) => (
                        <tr key={key} className="border-b border-border last:border-0 hover:bg-muted/50">
                            <td className="whitespace-nowrap px-3 py-2 align-top font-mono text-xs">{key}</td>
                            <td className="break-all px-3 py-2 align-top font-mono text-xs whitespace-pre-wrap">
                                {value}
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
    const {data, isLoading} = useConfigMapYAML(clusterId, namespace, name)
    const apply = useApplyConfigMap()

    if (isLoading) return <div className="h-64 animate-pulse rounded-md bg-muted"/>

    return (
        <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-muted"/>}>
            <YamlEditor
                initialValue={data ?? ''}
                isApplying={apply.isPending}
                onApply={(yaml) =>
                    apply.mutate(
                        {clusterId, namespace, name, yaml},
                        {onSuccess: () => toast.success(t('configmap.applied'))}
                    )
                }
            />
        </Suspense>
    )
}

export function ConfigMapDetailPage() {
    const {t} = useTranslation()
    const {namespace = '', name = ''} = useParams()
    const navigate = useNavigate()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const clusterId = activeCluster?.id ?? null
    const {data: configMap, isLoading, error} = useConfigMap(clusterId, namespace, name)
    const deleteConfigMap = useDeleteConfigMap()
    const [tab, setTab] = useState<Tab>('data')

    if (!activeCluster) return <NoCluster/>

    const handleDelete = () => {
        if (!clusterId) return
        if (window.confirm(t('configmap.deleteConfirm'))) {
            deleteConfigMap.mutate(
                {clusterId, namespace, name},
                {
                    onSuccess: () => {
                        toast.success(t('configmap.deleted'))
                        void navigate('/configmaps')
                    },
                }
            )
        }
    }

    return (
        <div className="flex min-h-full flex-col gap-4 p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <Link to="/configmaps" className="text-sm text-muted-foreground hover:text-foreground">
                        ← {t('sidebar.configmaps')}
                    </Link>
                    <div className="mt-1 flex items-center gap-3">
                        <h1 className="font-mono text-2xl font-semibold tracking-tight">{name}</h1>
                        {configMap && (
                            <Badge variant="outline">{Object.keys(configMap.data ?? {}).length}</Badge>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">{namespace}</p>
                </div>
                <Button size="sm" variant="destructive" onClick={handleDelete}>
                    {t('configmap.delete')}
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
                        {t(tb === 'data' ? 'configmap.data' : 'pod.yaml')}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="h-64 animate-pulse rounded-md bg-muted"/>
            ) : error ? (
                <p className="text-sm text-destructive">{String(error)}</p>
            ) : configMap ? (
                <>
                    {tab === 'data' && <DataTab configMap={configMap}/>}
                    {tab === 'yaml' && (
                        <YamlTab clusterId={clusterId as string} namespace={namespace} name={name}/>
                    )}
                </>
            ) : null}
        </div>
    )
}
