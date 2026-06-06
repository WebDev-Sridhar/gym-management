import { useState, createContext, useContext, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'

/**
 * Lets pages register a refresh handler that the topbar's Refresh button
 * invokes. Pages call useRegisterRefresh(fn) in an effect.
 */
const RefreshContext = createContext(null)
export function useAdminRefresh() {
  return useContext(RefreshContext)
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [handler, setHandler] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const registerRefresh = useCallback((fn) => setHandler(() => fn), [])

  const onRefresh = handler
    ? async () => {
        setRefreshing(true)
        try { await handler() } finally { setRefreshing(false) }
      }
    : null

  return (
    <RefreshContext.Provider value={registerRefresh}>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <AdminSidebar />
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-0 h-full">
              <AdminSidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminTopbar onMenu={() => setMobileOpen(true)} onRefresh={onRefresh} refreshing={refreshing} />
          <main className="flex-1 overflow-y-auto px-4 py-5 md:px-7 md:py-6">
            <div className="mx-auto w-full max-w-7xl admin-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </RefreshContext.Provider>
  )
}
