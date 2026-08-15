export type StatusVariant = 'success' | 'destructive' | 'warning' | 'outline'

export function podStatusVariant(status: string): StatusVariant {
    switch (status) {
        case 'Running':
            return 'success'
        case 'Failed':
            return 'destructive'
        case 'Pending':
            return 'warning'
        default:
            return 'outline'
    }
}
