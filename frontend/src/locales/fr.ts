import type {Translation} from './en'

export const fr: Translation = {
    common: {
        appName: "openk8s-desktop",
        theme: "Thème",
        language: "Langue",
        light: "Clair",
        dark: "Sombre",
        system: "Système",
    },
    sidebar: {
        dashboard: "Tableau de bord",
        clusters: "Clusters",
        namespaces: "Namespaces",
        workloads: "Workloads",
        pods: "Pods",
        services: "Services",
        ingress: "Ingress",
        configmaps: "ConfigMaps",
        secrets: "Secrets",
        events: "Événements",
    },
    topbar: {
        noActiveContext: "Aucun contexte actif",
        context: "Contexte",
        cluster: "Cluster",
        namespace: "Namespace",
    },
    dashboard: {
        title: "Tableau de bord",
        subtitle: "Ajoutez un cluster Kubernetes pour commencer.",
        application: "Application",
        version: "Version",
        goRuntime: "Runtime Go",
    },
    clusters: {
        title: "Clusters",
        subtitle: "Connectez et gérez des clusters Kubernetes (import de kubeconfig à l'étape suivante).",
        backendStatus: "Statut du backend",
    },
    placeholder: {
        description: "Cette section sera implémentée dans une étape ultérieure du MVP.",
    },
}
