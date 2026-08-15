import {useQuery} from '@tanstack/react-query'
import {GetVersion} from '@/lib/wails'

export function DashboardPage() {
    const {data: version} = useQuery({
        queryKey: ['version'],
        queryFn: () => GetVersion(),
    })

    return (
        <div className="flex h-full flex-col gap-6 p-8">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                    Add a Kubernetes cluster to get started.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-4">
                    <div className="text-sm text-muted-foreground">Application</div>
                    <div className="mt-1 text-lg font-semibold">
                        {version?.name ?? 'openk8s-desktop'}
                    </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                    <div className="text-sm text-muted-foreground">Version</div>
                    <div className="mt-1 text-lg font-semibold">
                        {version?.version ?? '—'}
                    </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                    <div className="text-sm text-muted-foreground">Go runtime</div>
                    <div className="mt-1 text-lg font-semibold">{version?.go ?? '—'}</div>
                </div>
            </div>
        </div>
    )
}
