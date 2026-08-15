import {createHashRouter} from 'react-router'
import {AppLayout} from '@/components/layout/app-layout'
import {ErrorBoundary} from '@/components/error-boundary'
import {PlaceholderPage} from '@/components/placeholder-page'
import {DashboardPage} from '@/features/dashboard/dashboard-page'
import {ClustersPage} from '@/features/clusters/clusters-page'
import {NamespacesPage} from '@/features/namespaces/namespaces-page'
import {NodesPage} from '@/features/nodes/nodes-page'
import {WorkloadsPage} from '@/features/workloads/workloads-page'
import {PodsPage} from '@/features/pods/pods-page'
import {PodDetailPage} from '@/features/pods/pod-detail-page'
import {ServicesPage} from '@/features/services/services-page'
import {IngressPage} from '@/features/ingress/ingress-page'

export const router = createHashRouter([
    {
        path: '/',
        element: (
            <ErrorBoundary>
                <AppLayout/>
            </ErrorBoundary>
        ),
        children: [
            {index: true, element: <DashboardPage/>},
            {path: 'clusters', element: <ClustersPage/>},
            {path: 'nodes', element: <NodesPage/>},
            {path: 'namespaces', element: <NamespacesPage/>},
            {path: 'workloads', element: <WorkloadsPage/>},
            {path: 'pods', element: <PodsPage/>},
            {path: 'pods/:namespace/:name', element: <PodDetailPage/>},
            {path: 'services', element: <ServicesPage/>},
            {path: 'ingress', element: <IngressPage/>},
            {path: 'configmaps', element: <PlaceholderPage titleKey="sidebar.configmaps"/>},
            {path: 'secrets', element: <PlaceholderPage titleKey="sidebar.secrets"/>},
            {path: 'events', element: <PlaceholderPage titleKey="sidebar.events"/>},
        ],
    },
])
