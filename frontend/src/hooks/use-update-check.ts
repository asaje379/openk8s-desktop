import {useQuery} from '@tanstack/react-query'
import {CheckForUpdate} from '@/lib/wails'

export const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000

export function useUpdateCheck() {
    return useQuery({
        queryKey: ['updateCheck'],
        queryFn: () => CheckForUpdate(),
        refetchInterval: UPDATE_CHECK_INTERVAL,
        retry: false,
        staleTime: UPDATE_CHECK_INTERVAL,
    })
}
