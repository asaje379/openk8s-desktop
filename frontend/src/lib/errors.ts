export function isForbiddenError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return message.toLowerCase().includes('forbidden')
}

export function isMetricsUnavailableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    const lower = message.toLowerCase()
    return (
        lower.includes('could not find the requested resource') ||
        lower.includes('no matches for kind')
    )
}
