import type {ReactNode} from 'react'
import {useTranslation} from 'react-i18next'
import {AlertTriangle} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {isForbiddenError} from '@/lib/errors'

interface ResourcePageProps {
    title: string
    actions?: ReactNode
    isLoading?: boolean
    error?: unknown
    onRetry?: () => void
    children: ReactNode
}

export function ResourcePage({
    title,
    actions,
    isLoading,
    error,
    onRetry,
    children,
}: ResourcePageProps) {
    const {t} = useTranslation()

    if (isLoading) {
        return (
            <div className="flex h-full flex-col gap-4 p-8">
                <div className="h-8 w-48 animate-pulse rounded-md bg-muted"/>
                <div className="h-72 animate-pulse rounded-md border border-border bg-muted"/>
            </div>
        )
    }

    if (error) {
        const forbidden = isForbiddenError(error)
        return (
            <div className="flex h-full flex-col gap-4 p-8">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                    {actions}
                </div>
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                    <AlertTriangle className="size-10 text-destructive"/>
                    <h2 className="text-lg font-semibold">
                        {forbidden ? t('resources.forbidden') : t('resources.loadError')}
                    </h2>
                    <p className="max-w-md text-sm text-muted-foreground">
                        {forbidden
                            ? t('resources.forbiddenDescription')
                            : error instanceof Error
                              ? error.message
                              : String(error)}
                    </p>
                    {onRetry && (
                        <Button variant="outline" onClick={onRetry}>
                            {t('error.retry')}
                        </Button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col gap-4 p-8">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {actions}
            </div>
            {children}
        </div>
    )
}
