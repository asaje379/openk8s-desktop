import {create} from 'zustand'

export interface ActiveCluster {
    id: string
    name: string
    context: string
}

interface AppState {
    activeCluster: ActiveCluster | null
    activeNamespace: string | null
    setActiveCluster: (cluster: ActiveCluster | null) => void
    setActiveNamespace: (ns: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
    activeCluster: null,
    activeNamespace: null,
    setActiveCluster: (cluster) => set({activeCluster: cluster, activeNamespace: null}),
    setActiveNamespace: (ns) => set({activeNamespace: ns}),
}))
