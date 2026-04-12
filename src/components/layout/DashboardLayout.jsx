import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function DashboardLayout({ sidebarLinks, title }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar links={sidebarLinks} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
