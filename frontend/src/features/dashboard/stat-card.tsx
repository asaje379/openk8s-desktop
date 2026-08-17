import {Link} from 'react-router'
import type {LucideIcon} from 'lucide-react'
import {cn} from '@/lib/utils'

interface StatCardProps {
    icon: LucideIcon
    label: string
    value: number
    detail?: string
    to?: string
    loading?: boolean
}

export function StatCard({icon: Icon, label, value, detail, to, loading}: StatCardProps) {
    const body = (
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <div className="truncate text-sm text-muted-foreground">{label}</div>
                {loading ? (
                    <div className="mt-1.5 h-7 w-14 animate-pulse rounded bg-muted"/>
                ) : (
                    <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
                )}
                {detail && !loading && (
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</div>
                )}
            </div>
            <div className="rounded-lg bg-muted/50 p-2 text-muted-foreground">
                <Icon className="size-4"/>
            </div>
        </div>
    )

    const cardClass = 'block rounded-xl border border-border bg-card p-4'
    if (to) {
        return (
            <Link to={to} className={cn(cardClass, 'transition-colors hover:border-primary/40')}>
                {body}
            </Link>
        )
    }
    return <div className={cardClass}>{body}</div>
}