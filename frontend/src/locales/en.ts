export const en = {
    common: {
        appName: 'openk8s-desktop',
        theme: 'Theme',
        language: 'Language',
        light: 'Light',
        dark: 'Dark',
        system: 'System',
    },
    sidebar: {
        dashboard: 'Dashboard',
        clusters: 'Clusters',
        namespaces: 'Namespaces',
        workloads: 'Workloads',
        pods: 'Pods',
        services: 'Services',
        ingress: 'Ingress',
        configmaps: 'ConfigMaps',
        secrets: 'Secrets',
        events: 'Events',
    },
    topbar: {
        noActiveContext: 'No active context',
        context: 'Context',
        cluster: 'Cluster',
        namespace: 'Namespace',
    },
    dashboard: {
        title: 'Dashboard',
        subtitle: 'Add a Kubernetes cluster to get started.',
        application: 'Application',
        version: 'Version',
        goRuntime: 'Go runtime',
    },
    clusters: {
        title: 'Clusters',
        subtitle: 'Connect and manage Kubernetes clusters (kubeconfig import coming in the next step).',
        backendStatus: 'Backend status',
    },
    placeholder: {
        description: 'This section will be implemented in a later step of the MVP.',
    },
}

export type Translation = typeof en
