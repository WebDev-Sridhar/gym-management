import { Routes, Route, Navigate } from 'react-router-dom'
import { adminPath } from './lib/adminBase'
import AdminProtectedRoute from './components/AdminProtectedRoute'
import AdminLayout from './components/AdminLayout'
import DashboardPage from './pages/DashboardPage'
import GymsPage from './pages/GymsPage'
import GymProfilePage from './pages/GymProfilePage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import RevenuePage from './pages/RevenuePage'
import MessagingPage from './pages/MessagingPage'
import DomainsPage from './pages/DomainsPage'
import QuotasPage from './pages/QuotasPage'
import SupportPage from './pages/SupportPage'
import OperationsPage from './pages/OperationsPage'
import FeatureFlagsPage from './pages/FeatureFlagsPage'
import SettingsPage from './pages/SettingsPage'
import AuditLogPage from './pages/AuditLogPage'
import AdminsPage from './pages/AdminsPage'

/**
 * Admin route table. Mounted under a splat (`/*` on admin host, `/admin/*` in
 * dev) so all child paths are RELATIVE — they resolve correctly under either
 * base. The whole tree is gated by AdminProtectedRoute.
 */
export default function AdminApp() {
  return (
    <div className="app-admin">
      <Routes>
        <Route
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="gyms" element={<GymsPage />} />
          <Route path="gyms/:gymId" element={<GymProfilePage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="revenue" element={<RevenuePage />} />
          <Route path="messaging" element={<MessagingPage />} />
          <Route path="domains" element={<DomainsPage />} />
          <Route path="quotas" element={<QuotasPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="operations" element={<OperationsPage />} />
          <Route path="flags" element={<FeatureFlagsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="audit" element={<AuditLogPage />} />
          <Route path="admins" element={<AdminsPage />} />
          <Route path="*" element={<Navigate to={adminPath('')} replace />} />
        </Route>
      </Routes>
    </div>
  )
}
