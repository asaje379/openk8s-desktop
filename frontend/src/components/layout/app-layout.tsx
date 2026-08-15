import {Outlet} from 'react-router'
import {Sidebar} from './sidebar'
import {Topbar} from './topbar'

export function AppLayout() {
    return (
        <div className="flex h-screen flex-col">
            <Topbar/>
            <div className="flex flex-1 overflow-hidden">
                <Sidebar/>
                <main className="flex-1 overflow-y-auto">
                    <Outlet/>
                </main>
            </div>
        </div>
    )
}
