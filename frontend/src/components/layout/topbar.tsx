import {useAppStore} from '@/stores/app-store'

export function Topbar() {
    const activeClusterId = useAppStore((s) => s.activeClusterId)
    const currentContext = useAppStore((s) => s.currentContext)
    const activeNamespace = useAppStore((s) => s.activeNamespace)

    return (
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
            <div className="text-sm text-muted-foreground">
                {currentContext ? (
                    <span>
                        Context: <span className="font-medium text-foreground">{currentContext}</span>
                    </span>
                ) : (
                    <span>No active context</span>
                )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {activeClusterId && <span>Cluster: {activeClusterId}</span>}
                {activeNamespace && <span>Namespace: {activeNamespace}</span>}
            </div>
        </header>
    )
}
