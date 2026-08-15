import {useQuery} from '@tanstack/react-query'
import {Health} from '@/lib/wails'

export function ClustersPage() {
    const {data: health} = useQuery({
        queryKey: ['health'],
        queryFn: () => Health(),
    })

    return (
        <div className="flex h-full flex-col gap-6 p-8">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Clusters</h1>
                <p className="text-sm text-muted-foreground">
                    Connect and manage Kubernetes clusters (kubeconfig import coming in the next step).
                </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                Backend status: <span className="font-medium text-foreground">{health ?? '…'}</span>
            </div>
        </div>
    )
}
