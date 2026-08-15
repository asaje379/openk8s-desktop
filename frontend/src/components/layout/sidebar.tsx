import {
    Bell,
    Box,
    Boxes,
    Container,
    FileText,
    KeyRound,
    Layers,
    LayoutDashboard,
    Network,
    Route,
    type LucideIcon,
} from 'lucide-react'
import {NavLink} from 'react-router'
import {cn} from '@/lib/utils'

interface NavItem {
    to: string
    label: string
    icon: LucideIcon
}

const navItems: NavItem[] = [
    {to: '/', label: 'Dashboard', icon: LayoutDashboard},
    {to: '/clusters', label: 'Clusters', icon: Boxes},
    {to: '/namespaces', label: 'Namespaces', icon: Layers},
    {to: '/workloads', label: 'Workloads', icon: Container},
    {to: '/pods', label: 'Pods', icon: Box},
    {to: '/services', label: 'Services', icon: Network},
    {to: '/ingress', label: 'Ingress', icon: Route},
    {to: '/configmaps', label: 'ConfigMaps', icon: FileText},
    {to: '/secrets', label: 'Secrets', icon: KeyRound},
    {to: '/events', label: 'Events', icon: Bell},
]

export function Sidebar() {
    return (
        <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
            <div className="flex h-14 items-center border-b border-border px-4 text-sm font-semibold">
                openk8s-desktop
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-2">
                {navItems.map(({to, label, icon: Icon}) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({isActive}) =>
                            cn(
                                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                            )
                        }
                    >
                        <Icon className="size-4"/>
                        {label}
                    </NavLink>
                ))}
            </nav>
        </aside>
    )
}
