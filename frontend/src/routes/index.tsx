import {createHashRouter} from 'react-router'
import {AppLayout} from '@/components/layout/app-layout'
import {ErrorBoundary} from '@/components/error-boundary'
import {PlaceholderPage} from '@/components/placeholder-page'
import {DashboardPage} from '@/features/dashboard/dashboard-page'
import {ClustersPage} from '@/features/clusters/clusters-page'

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
            {path: 'namespaces', element: <PlaceholderPage titleKey="sidebar.namespaces"/>},
            {path: 'workloads', element: <PlaceholderPage titleKey="sidebar.workloads"/>},
            {path: 'pods', element: <PlaceholderPage titleKey="sidebar.pods"/>},
            {path: 'services', element: <PlaceholderPage titleKey="sidebar.services"/>},
            {path: 'ingress', element: <PlaceholderPage titleKey="sidebar.ingress"/>},
            {path: 'configmaps', element: <PlaceholderPage titleKey="sidebar.configmaps"/>},
            {path: 'secrets', element: <PlaceholderPage titleKey="sidebar.secrets"/>},
            {path: 'events', element: <PlaceholderPage titleKey="sidebar.events"/>},
        ],
    },
])
