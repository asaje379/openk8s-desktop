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
import {useTranslation} from 'react-i18next'
import {cn} from '@/lib/utils'

interface NavItem {
    to: string
    labelKey: string
    icon: LucideIcon
}

const navItems: NavItem[] = [
    {to: '/', labelKey: 'sidebar.dashboard', icon: LayoutDashboard},
    {to: '/clusters', labelKey: 'sidebar.clusters', icon: Boxes},
    {to: '/namespaces', labelKey: 'sidebar.namespaces', icon: Layers},
    {to: '/workloads', labelKey: 'sidebar.workloads', icon: Container},
    {to: '/pods', labelKey: 'sidebar.pods', icon: Box},
    {to: '/services', labelKey: 'sidebar.services', icon: Network},
    {to: '/ingress', labelKey: 'sidebar.ingress', icon: Route},
    {to: '/configmaps', labelKey: 'sidebar.configmaps', icon: FileText},
    {to: '/secrets', labelKey: 'sidebar.secrets', icon: KeyRound},
    {to: '/events', labelKey: 'sidebar.events', icon: Bell},
]

export function Sidebar() {
    const {t} = useTranslation()

    return (
        <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
            <div className="flex h-14 items-center border-b border-border px-4 text-sm font-semibold">
                {t('common.appName')}
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-2">
                {navItems.map(({to, labelKey, icon: Icon}) => (
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
                        {t(labelKey)}
                    </NavLink>
                ))}
            </nav>
        </aside>
    )
}
