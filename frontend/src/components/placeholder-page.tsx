interface PlaceholderPageProps {
    title: string
    description?: string
}

export function PlaceholderPage({title, description}: PlaceholderPageProps) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="max-w-md text-sm text-muted-foreground">
                {description ?? 'This section will be implemented in a later step of the MVP.'}
            </p>
        </div>
    )
}
