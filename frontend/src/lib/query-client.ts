import {MutationCache, QueryCache, QueryClient} from '@tanstack/react-query'
import {toast} from 'sonner'

function toMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

const onError = (error: unknown) => {
    toast.error(toMessage(error))
}

export const queryClient = new QueryClient({
    queryCache: new QueryCache({onError}),
    mutationCache: new MutationCache({onError}),
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
