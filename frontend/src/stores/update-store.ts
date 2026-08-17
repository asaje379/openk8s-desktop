import {create} from 'zustand'
import {EventsOn} from '@/lib/wails'

export type UpdatePhase = 'idle' | 'downloading' | 'verifying' | 'ready' | 'applying' | 'error'

export interface UpdateProgress {
    phase: 'download' | 'verify' | 'done' | 'error'
    percent?: number
    bytes?: number
    total?: number
    error?: string
}

interface UpdateState {
    phase: UpdatePhase
    percent: number
    error: string | null
    applyEvent: (p: UpdateProgress) => void
    startDownload: () => void
    setPhase: (phase: UpdatePhase) => void
}

export const useUpdateStore = create<UpdateState>((set) => ({
    phase: 'idle',
    percent: 0,
    error: null,
    applyEvent: (p) => {
        switch (p.phase) {
            case 'download':
                set({phase: 'downloading', percent: p.percent ?? 0, error: null})
                break
            case 'verify':
                set({phase: 'verifying', percent: 100, error: null})
                break
            case 'done':
                set({phase: 'ready', percent: 100, error: null})
                break
            case 'error':
                set({phase: 'error', error: p.error ?? 'unknown error'})
                break
        }
    },
    startDownload: () => set({phase: 'downloading', percent: 0, error: null}),
    setPhase: (phase) => set({phase, error: null}),
}))

export function registerUpdateEvents(): () => void {
    return EventsOn('update:progress', (p: UpdateProgress) => {
        useUpdateStore.getState().applyEvent(p)
    })
}