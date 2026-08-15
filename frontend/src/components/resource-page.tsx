import type {ReactNode} from 'react'

interface ResourcePageProps {
    title: string
    actions?: ReactNode
    isLoading?: boolean
    children: ReactNode
}

export function ResourcePage({title, actions, isLoading, children}: ResourcePageProps) {
    return (
        <div className="flex h-full flex-col gap-4 p-8">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {actions}
            </div>
            {isLoading ? (
                <div className="h-72 animate-pulse rounded-md border border-border bg-muted"/>
            ) : (
                children
            )}
        </div>
    )
}
