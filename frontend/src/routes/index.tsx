import {lazy, Suspense, type ReactNode} from 'react'
import {createHashRouter} from 'react-router'
import {AppLayout} from '@/components/layout/app-layout'
import {ErrorBoundary} from '@/components/error-boundary'
import {PageLoader} from '@/components/page-loader'

function page(el: ReactNode) {
    return <Suspense fallback={<PageLoader/>}>{el}</Suspense>
}

const DashboardPage = lazy(() =>
    import('@/features/dashboard/dashboard-page').then((m) => ({default: m.DashboardPage}))
)
const ClustersPage = lazy(() =>
    import('@/features/clusters/clusters-page').then((m) => ({default: m.ClustersPage}))
)
const NodesPage = lazy(() =>
    import('@/features/nodes/nodes-page').then((m) => ({default: m.NodesPage}))
)
const NamespacesPage = lazy(() =>
    import('@/features/namespaces/namespaces-page').then((m) => ({default: m.NamespacesPage}))
)
const WorkloadsPage = lazy(() =>
    import('@/features/workloads/workloads-page').then((m) => ({default: m.WorkloadsPage}))
)
const DeploymentDetailPage = lazy(() =>
    import('@/features/workloads/deployment-detail-page').then((m) => ({
        default: m.DeploymentDetailPage,
    }))
)
const PodsPage = lazy(() =>
    import('@/features/pods/pods-page').then((m) => ({default: m.PodsPage}))
)
const PodDetailPage = lazy(() =>
    import('@/features/pods/pod-detail-page').then((m) => ({default: m.PodDetailPage}))
)
const ServicesPage = lazy(() =>
    import('@/features/services/services-page').then((m) => ({default: m.ServicesPage}))
)
const IngressPage = lazy(() =>
    import('@/features/ingress/ingress-page').then((m) => ({default: m.IngressPage}))
)
const PlaceholderPage = lazy(() =>
    import('@/components/placeholder-page').then((m) => ({default: m.PlaceholderPage}))
)

export const router = createHashRouter([
    {
        path: '/',
        element: (
            <ErrorBoundary>
                <AppLayout/>
            </ErrorBoundary>
        ),
        children: [
            {index: true, element: page(<DashboardPage/>)},
            {path: 'clusters', element: page(<ClustersPage/>)},
            {path: 'nodes', element: page(<NodesPage/>)},
            {path: 'namespaces', element: page(<NamespacesPage/>)},
            {path: 'workloads', element: page(<WorkloadsPage/>)},
            {path: 'workloads/deployments/:namespace/:name', element: page(<DeploymentDetailPage/>)},
            {path: 'pods', element: page(<PodsPage/>)},
            {path: 'pods/:namespace/:name', element: page(<PodDetailPage/>)},
            {path: 'services', element: page(<ServicesPage/>)},
            {path: 'ingress', element: page(<IngressPage/>)},
            {path: 'configmaps', element: page(<PlaceholderPage titleKey="sidebar.configmaps"/> )},
            {path: 'secrets', element: page(<PlaceholderPage titleKey="sidebar.secrets"/> )},
            {path: 'events', element: page(<PlaceholderPage titleKey="sidebar.events"/> )},
        ],
    },
])
