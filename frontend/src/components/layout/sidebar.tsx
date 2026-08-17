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
    Server,
    type LucideIcon,
} from 'lucide-react'
import {useQuery} from '@tanstack/react-query'
import {NavLink} from 'react-router'
import {useTranslation} from 'react-i18next'
import {BrandLogo} from '@/components/brand-logo'
import {GetVersion} from '@/lib/wails'
import {cn} from '@/lib/utils'

interface NavItem {
    to: string
    labelKey: string
    icon: LucideIcon
}

const navItems: NavItem[] = [
    {to: '/', labelKey: 'sidebar.dashboard', icon: LayoutDashboard},
    {to: '/clusters', labelKey: 'sidebar.clusters', icon: Boxes},
    {to: '/nodes', labelKey: 'sidebar.nodes', icon: Server},
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
    const {data: version} = useQuery({
        queryKey: ['version'],
        queryFn: () => GetVersion(),
        retry: false,
    })

    return (
        <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
            <div className="flex h-14 items-center gap-3 border-b border-border px-4">
                <BrandLogo size="sm"/>
                <div className="min-w-0 leading-tight">
                    <div className="truncate text-sm font-semibold">{t('common.appName')}</div>
                </div>
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
                                    ? 'bg-primary/10 text-primary shadow-[inset_3px_0_0_0] shadow-primary'
                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            )
                        }
                    >
                        <Icon className="size-4"/>
                        {t(labelKey)}
                    </NavLink>
                ))}
            </nav>
            <div className="border-t border-border px-4 py-2">
                <p className="text-[11px] text-muted-foreground">
                    {version?.version ? `v${version.version}` : ''}
                </p>
            </div>
        </aside>
    )
}
