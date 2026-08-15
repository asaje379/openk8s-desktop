import {Outlet} from 'react-router'
import {Sidebar} from './sidebar'
import {Topbar} from './topbar'

export function AppLayout() {
    return (
        <div className="flex h-dvh flex-col overflow-hidden">
            <Topbar/>
            <div className="flex min-h-0 flex-1">
                <Sidebar/>
                <main className="min-w-0 flex-1 overflow-y-auto">
                    <Outlet/>
                </main>
            </div>
        </div>
    )
}
