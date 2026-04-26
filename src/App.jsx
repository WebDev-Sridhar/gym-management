import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './store/AuthContext'
import DashboardLayout from './components/layout/DashboardLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import PublicRoute from './components/layout/PublicRoute'
import LandingPage from './pages/landing/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import CreateGymPage from './pages/auth/CreateGymPage'
import OnboardingPage from './pages/auth/OnboardingPage'
import BillingPage from './pages/auth/BillingPage'
import AuthCallbackPage from './pages/auth/AuthCallbackPage'
import OwnerDashboard from './pages/owner/OwnerDashboard'
import PlansPage from './pages/owner/PlansPage'
import MembersPage from './pages/owner/MembersPage'
import PaymentsPage from './pages/owner/PaymentsPage'
import AttendancePage from './pages/owner/AttendancePage'
import AnalyticsPage from './pages/owner/AnalyticsPage'
import TrainersPage from './pages/owner/TrainersPage'
import SettingsPage from './pages/owner/SettingsPage'
import WebsitePage from './pages/owner/WebsitePage'
import StarterWebsitePage from './pages/owner/StarterWebsitePage'
import TrainerDashboard from './pages/trainer/TrainerDashboard'
import MemberApp from './pages/member/MemberApp'
import CheckinPage from './pages/checkin/CheckinPage'
import GymLayout from './components/gym/GymLayout'
import GymHome from './pages/gym/GymHome'
import GymAbout from './pages/gym/GymAbout'
import GymPricing from './pages/gym/GymPricing'
import GymTrainers from './pages/gym/GymTrainers'
import GymContact from './pages/gym/GymContact'
import FeaturesPage from './pages/landing/FeaturesPage'
import PricingPage from './pages/landing/PricingPage'
import DemoPage from './pages/landing/DemoPage'
import ChangelogPage from './pages/landing/ChangelogPage'
import AboutPage from './pages/landing/AboutPage'
import BlogPage from './pages/landing/BlogPage'
import CareersPage from './pages/landing/CareersPage'
import ContactPage from './pages/landing/ContactPage'
import PrivacyPage from './pages/landing/PrivacyPage'
import TermsPage from './pages/landing/TermsPage'
import SecurityPage from './pages/landing/SecurityPage'
import RefundPolicyPage from './pages/landing/RefundPolicyPage'


function WebsitePageRouter() {
  const { subscription } = useAuth()
  const planName = subscription?.plan_name ?? 'Starter'
  return planName === 'Starter' ? <StarterWebsitePage /> : <WebsitePage />
}

const ownerLinks = [
  { to: '/owner-dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/owner-dashboard/members', icon: 'members', label: 'Members' },
  { to: '/owner-dashboard/plans', icon: 'plans', label: 'Plans' },
  { to: '/owner-dashboard/payments', icon: 'payments', label: 'Payments' },
  { to: '/owner-dashboard/trainers', icon: 'trainers', label: 'Trainers' },
  { to: '/owner-dashboard/analytics', icon: 'analytics', label: 'Analytics' },
  { to: '/owner-dashboard/checkin', icon: 'checkin', label: 'Check-in' },
  { to: '/owner-dashboard/website', icon: 'website', label: 'Website' },
]

const trainerLinks = [
  { to: '/trainer-dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/trainer-dashboard/members', icon: 'members', label: 'My Members' },
  { to: '/trainer-dashboard/workouts', icon: 'workouts', label: 'Workouts' },
  { to: '/trainer-dashboard/settings', icon: 'settings', label: 'Settings' },
]

const memberLinks = [
  { to: '/member-app', icon: 'dashboard', label: 'Home' },
  { to: '/member-app/workouts', icon: 'workouts', label: 'Workouts' },
  { to: '/member-app/profile', icon: 'profile', label: 'Profile' },
]

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/checkin" element={<CheckinPage />} />
          <Route path="/features" element={<FeaturesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/changelog" element={<ChangelogPage />} />

<Route path="/about" element={<AboutPage />} />
<Route path="/blog" element={<BlogPage />} />
<Route path="/careers" element={<CareersPage />} />
<Route path="/contact" element={<ContactPage />} />

<Route path="/privacy" element={<PrivacyPage />} />
<Route path="/terms" element={<TermsPage />} />
<Route path="/security" element={<SecurityPage />} />
<Route path="/refund-policy" element={<RefundPolicyPage />} />

          {/* Auth & onboarding flow */}
          <Route path="/login" element={
            <PublicRoute><LoginPage /></PublicRoute>
          } />
          <Route path="/signup" element={
            <PublicRoute><SignupPage /></PublicRoute>
          } />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/create-gym" element={<CreateGymPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/billing" element={<BillingPage />} />

          {/* Owner dashboard — protected, owner only, subscription required */}
          <Route path="/owner-dashboard" element={
            <ProtectedRoute allowedRoles={['owner']}>
              <DashboardLayout sidebarLinks={ownerLinks} />
            </ProtectedRoute>
          }>
            <Route index element={<OwnerDashboard />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="trainers" element={<TrainersPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="checkin" element={<AttendancePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="website" element={<WebsitePageRouter />} />
          </Route>

          {/* Trainer dashboard — protected, trainer only */}
          <Route path="/trainer-dashboard" element={
            <ProtectedRoute allowedRoles={['trainer']}>
              <DashboardLayout sidebarLinks={trainerLinks} />
            </ProtectedRoute>
          }>
            <Route index element={<TrainerDashboard />} />
          </Route>

          {/* Member app — protected, member only */}
          <Route path="/member-app" element={
            <ProtectedRoute allowedRoles={['member']}>
              <DashboardLayout sidebarLinks={memberLinks} />
            </ProtectedRoute>
          }>
            <Route index element={<MemberApp />} />
          </Route>
          {/* Public gym pages — must be LAST (dynamic :gymSlug param) */}
          <Route path="/:gymSlug" element={<GymLayout />}>
            <Route index element={<GymHome />} />
            <Route path="about" element={<GymAbout />} />
            <Route path="pricing" element={<GymPricing />} />
            <Route path="trainers" element={<GymTrainers />} />
            <Route path="contact" element={<GymContact />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
