import {MutationCache, QueryClient} from '@tanstack/react-query'
import {toast} from 'sonner'

function toMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

export const queryClient = new QueryClient({
    mutationCache: new MutationCache({
        onError: (error) => toast.error(toMessage(error)),
    }),
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: 0,
        },
    },
})
