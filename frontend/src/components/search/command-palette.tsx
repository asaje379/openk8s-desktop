import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useNavigate} from 'react-router'
import {useQuery} from '@tanstack/react-query'
import {Search} from 'lucide-react'
import {SearchResources} from '@/lib/wails'
import type {SearchResult} from '@/lib/wails'
import {useAppStore} from '@/stores/app-store'
import {useUIStore} from '@/stores/ui-store'
import {Badge} from '@/components/ui/badge'

function targetFor(r: SearchResult): string {
    switch (r.kind) {
        case 'Pod':
            return `/pods/${r.namespace}/${r.name}`
        case 'Deployment':
            return `/workloads/deployments/${r.namespace}/${r.name}`
        case 'ConfigMap':
            return `/configmaps/${r.namespace}/${r.name}`
        case 'Secret':
            return `/secrets/${r.namespace}/${r.name}`
        case 'Service':
            return '/services'
        case 'Ingress':
            return '/ingress'
        case 'Node':
            return '/nodes'
        case 'Namespace':
            return '/namespaces'
        default:
            return '/workloads'
    }
}

export function CommandPalette() {
    const {t} = useTranslation()
    const navigate = useNavigate()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const activeNamespace = useAppStore((s) => s.activeNamespace)
    const searchOpen = useUIStore((s) => s.searchOpen)
    const setSearchOpen = useUIStore((s) => s.setSearchOpen)
    const [query, setQuery] = useState('')

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                setSearchOpen(!searchOpen)
            }
            if (e.key === 'Escape') setSearchOpen(false)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [searchOpen, setSearchOpen])

    useEffect(() => {
        if (!searchOpen) setQuery('')
    }, [searchOpen])

    const {data = []} = useQuery({
        queryKey: ['search', activeCluster?.id ?? null, activeNamespace ?? '', query],
        queryFn: () => SearchResources(activeCluster?.id ?? '', activeNamespace ?? '', query),
        enabled: searchOpen && !!activeCluster && query.trim().length >= 2,
        retry: false,
        staleTime: 0,
    })

    if (!searchOpen) return null

    const handleSelect = (r: SearchResult) => {
        setSearchOpen(false)
        void navigate(targetFor(r))
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[15vh]"
            onClick={() => setSearchOpen(false)}
        >
            <div
                className="w-full max-w-xl overflow-hidden rounded-lg border border-border bg-card shadow-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 border-b border-border px-3">
                    <Search className="size-4 text-muted-foreground"/>
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('search.placeholder')}
                        className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                    <kbd className="rounded border border-border px-1.5 text-xs text-muted-foreground">Esc</kbd>
                </div>
                <div className="max-h-[50vh] overflow-y-auto p-2">
                    {!activeCluster ? (
                        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                            {t('search.noCluster')}
                        </p>
                    ) : query.trim().length < 2 ? (
                        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                            {t('search.hint')}
                        </p>
                    ) : data.length === 0 ? (
                        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                            {t('search.noResults')}
                        </p>
                    ) : (
                        data.map((r) => (
                            <button
                                key={`${r.kind}/${r.namespace}/${r.name}`}
                                type="button"
                                onClick={() => handleSelect(r)}
                                className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                            >
                                <span className="font-mono text-[13px]">{r.name}</span>
                                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {r.namespace && <span>{r.namespace}</span>}
                                    <Badge variant="outline">{r.kind}</Badge>
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
