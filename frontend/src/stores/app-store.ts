import {create} from 'zustand'

interface AppState {
    activeClusterId: string | null
    activeNamespace: string | null
    currentContext: string | null
    setActiveCluster: (id: string | null) => void
    setActiveNamespace: (ns: string | null) => void
    setCurrentContext: (ctx: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
    activeClusterId: null,
    activeNamespace: null,
    currentContext: null,
    setActiveCluster: (id) => set({activeClusterId: id}),
    setActiveNamespace: (ns) => set({activeNamespace: ns}),
    setCurrentContext: (ctx) => set({currentContext: ctx}),
}))
