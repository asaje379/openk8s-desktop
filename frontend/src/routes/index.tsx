import {createHashRouter} from 'react-router'
import {AppLayout} from '@/components/layout/app-layout'
import {PlaceholderPage} from '@/components/placeholder-page'
import {DashboardPage} from '@/features/dashboard/dashboard-page'
import {ClustersPage} from '@/features/clusters/clusters-page'

export const router = createHashRouter([
    {
        path: '/',
        element: <AppLayout/>,
        children: [
            {index: true, element: <DashboardPage/>},
            {path: 'clusters', element: <ClustersPage/>},
            {path: 'namespaces', element: <PlaceholderPage title="Namespaces"/>},
            {path: 'workloads', element: <PlaceholderPage title="Workloads"/>},
            {path: 'pods', element: <PlaceholderPage title="Pods"/>},
            {path: 'services', element: <PlaceholderPage title="Services"/>},
            {path: 'ingress', element: <PlaceholderPage title="Ingress"/>},
            {path: 'configmaps', element: <PlaceholderPage title="ConfigMaps"/>},
            {path: 'secrets', element: <PlaceholderPage title="Secrets"/>},
            {path: 'events', element: <PlaceholderPage title="Events"/>},
        ],
    },
])
