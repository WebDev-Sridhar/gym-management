import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './store/AuthContext'
import { ThemeProvider } from './store/ThemeContext'
import { DialogProvider } from './components/ui/Dialog'
import DashboardLayout from './components/layout/DashboardLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import PublicRoute from './components/layout/PublicRoute'
import LandingPage from './pages/landing/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import CreateGymPage from './pages/auth/CreateGymPage'
import OnboardingPage from './pages/auth/OnboardingPage'
import BillingPage from './pages/auth/BillingPage'
import AuthCallbackPage from './pages/auth/AuthCallbackPage'
import OwnerDashboard from './pages/owner/OwnerDashboard'
import HomePage from './pages/owner/HomePage'
import PlansPage from './pages/owner/PlansPage'
import MembersPage from './pages/owner/MembersPage'
import PaymentsPage from './pages/owner/PaymentsPage'
import AttendancePage from './pages/owner/AttendancePage'
import AnalyticsPage from './pages/owner/AnalyticsPage'
import TrainersPage from './pages/owner/TrainersPage'
import SettingsPage from './pages/owner/SettingsPage'
import WebsitePage from './pages/owner/WebsitePage'
import PaymentSettingsPage from './pages/owner/PaymentSettingsPage'
import CommunicationPage from './pages/owner/CommunicationPage'
import MessagesPage from './pages/owner/MessagesPage'
import ProgramsPage from './pages/owner/ProgramsPage'
import SubscriptionPage from './pages/owner/SubscriptionPage'
import SupportPage from './pages/owner/SupportPage'
import StarterWebsitePage from './pages/owner/StarterWebsitePage'
import BranchesPage from './pages/owner/BranchesPage'
import TrainerLayout from './components/layout/TrainerLayout'
import MemberLayout from './components/layout/MemberLayout'
import CheckinPage from './pages/checkin/CheckinPage'
import PayLandingPage from './pages/pay/PayLandingPage'
import GymLayout from './components/gym/GymLayout'
import GymHome from './pages/gym/GymHome'
import GymAbout from './pages/gym/GymAbout'
import GymPricing from './pages/gym/GymPricing'
import GymTrainers from './pages/gym/GymTrainers'
import GymContact from './pages/gym/GymContact'
import GymLoginPage from './pages/gym/GymLoginPage'
import GymJoinPage from './pages/gym/GymJoinPage'
import ScrollToTop from './ScrollToTop'
import PwaInstallBanner from './components/PwaInstallBanner'
import { ROUTES } from './lib/constants/routes'
import { detectHost } from './lib/host'

// Detect host kind once at app boot. Hostname can only change with a full
// page reload, so this is stable for the entire React lifecycle.
const HOST_KIND = typeof window !== 'undefined'
  ? detectHost(window.location.hostname).kind
  : 'main'

// Lazy-load marketing & legal pages — they're public, not the hot path.
const FeaturesPage = lazy(() => import('./pages/landing/FeaturesPage'))
const PricingPage = lazy(() => import('./pages/landing/PricingPage'))
const DemoPage = lazy(() => import('./pages/landing/DemoPage'))
const ChangelogPage = lazy(() => import('./pages/landing/ChangelogPage'))
const AboutPage = lazy(() => import('./pages/landing/AboutPage'))
const BlogPage = lazy(() => import('./pages/landing/BlogPage'))
const CareersPage = lazy(() => import('./pages/landing/CareersPage'))
const ContactPage = lazy(() => import('./pages/landing/ContactPage'))
const PrivacyPage = lazy(() => import('./pages/landing/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/landing/TermsPage'))
const SecurityPage = lazy(() => import('./pages/landing/SecurityPage'))
const RefundPolicyPage = lazy(() => import('./pages/landing/RefundPolicyPage'))

// Per-gym public legal pages — same content template, gym data injected at runtime
const GymPrivacyPage = lazy(() => import('./pages/gym/legal/GymPrivacyPage'))
const GymTermsPage = lazy(() => import('./pages/gym/legal/GymTermsPage'))
const GymRefundPage = lazy(() => import('./pages/gym/legal/GymRefundPage'))
const GymMembershipPage = lazy(() => import('./pages/gym/legal/GymMembershipPage'))
const GymWaiverPage = lazy(() => import('./pages/gym/legal/GymWaiverPage'))


function WebsitePageRouter() {
  const { subscription } = useAuth()
  const planName = subscription?.plan_name ?? 'Starter'
  return planName === 'Starter' ? <StarterWebsitePage /> : <WebsitePage />
}

// Gym public-page children — shared between main-domain (/:gymSlug/*) and
// subdomain/custom-domain (/*) route mounts. Defined once to keep both
// blocks in sync.
const gymChildRoutes = (
  <>
    <Route index element={<GymHome />} />
    <Route path="about" element={<GymAbout />} />
    <Route path="pricing" element={<GymPricing />} />
    <Route path="trainers" element={<GymTrainers />} />
    <Route path="contact" element={<GymContact />} />
    <Route path="login" element={<GymLoginPage />} />
    <Route path="join" element={<GymJoinPage />} />
    <Route path="privacy" element={<GymPrivacyPage />} />
    <Route path="terms" element={<GymTermsPage />} />
    <Route path="refund" element={<GymRefundPage />} />
    <Route path="membership" element={<GymMembershipPage />} />
    <Route path="waiver" element={<GymWaiverPage />} />
  </>
)




// Routes block rendered when the visitor lands on a tenant host
// (iron-paradise.gymmobius.com or a verified custom domain). No marketing
// pages, no owner dashboard — the owner always uses the main host.
//
// `/auth/callback` and `/reset-password` are mounted as siblings of GymLayout
// (not nested under it) so they render bare, without gym chrome. Required
// on tenant hosts because Supabase email links use the originating host as
// `redirectTo` — a member who signs up at iron-paradise.gymmobius.com
// receives a confirmation link that lands at iron-paradise.gymmobius.com/auth/
// callback. Without these routes, the link 404s.
//
// `/member-app` and `/trainer-dashboard` mounted here so that AuthCallback
// (or any post-login navigation) on a tenant host can reach the user's
// dashboard without leaving the tenant origin. Phase 2 added these — before
// then, navigate('/member-app') on a subdomain matched nothing and left the
// user on a blank page after signup confirmation. Owner dashboard NOT
// mounted: owners belong on the main host.
function TenantRoutes() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/trainer-dashboard/*" element={
        <ProtectedRoute allowedRoles={['trainer']}>
          <TrainerLayout />
        </ProtectedRoute>
      } />
      <Route path="/member-app/*" element={
        <ProtectedRoute allowedRoles={['member']}>
          <MemberLayout />
        </ProtectedRoute>
      } />
      <Route path="/" element={<GymLayout />}>
        {gymChildRoutes}
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      {HOST_KIND === 'main' && <PwaInstallBanner />}
      <DialogProvider>
      <AuthProvider>
        <ThemeProvider>
        <Suspense fallback={null}>
        {HOST_KIND !== 'main' ? <TenantRoutes /> : (
        <Routes>
          {/* Public routes */}
          <Route path={ROUTES.HOME} element={<LandingPage />} />
          <Route path="/checkin" element={<CheckinPage />} />
          <Route path="/pay/:token" element={<PayLandingPage />} />
          <Route path={ROUTES.FEATURES} element={<FeaturesPage />} />
          <Route path={ROUTES.PRICING} element={<PricingPage />} />
          <Route path={ROUTES.DEMO} element={<DemoPage />} />
          <Route path={ROUTES.CHANGELOG} element={<ChangelogPage />} />

          <Route path={ROUTES.ABOUT} element={<AboutPage />} />
          <Route path={ROUTES.BLOG} element={<BlogPage />} />
          <Route path={ROUTES.CAREERS} element={<CareersPage />} />
          <Route path={ROUTES.CONTACT} element={<ContactPage />} />

          <Route path={ROUTES.LEGAL.PRIVACY} element={<PrivacyPage />} />
          <Route path={ROUTES.LEGAL.TERMS} element={<TermsPage />} />
          <Route path={ROUTES.LEGAL.SECURITY} element={<SecurityPage />} />
          <Route path={ROUTES.LEGAL.REFUND} element={<RefundPolicyPage />} />

          {/* Auth & onboarding flow */}
          {/* LoginPage owns its own post-auth routing so it can show the
              Phase 4 portal-redirect interstitial before navigating non-owners
              to /member-app. disableAuthedRedirect skips PublicRoute's auto-
              Navigate that would otherwise race the interstitial. */}
          <Route path={ROUTES.AUTH.LOGIN} element={
            <PublicRoute disableAuthedRedirect><LoginPage /></PublicRoute>
          } />
          <Route path={ROUTES.AUTH.SIGNUP} element={
            <PublicRoute><SignupPage /></PublicRoute>
          } />
          <Route path={ROUTES.AUTH.RESET} element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/create-gym" element={<CreateGymPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/billing" element={<BillingPage />} />

          {/* Owner dashboard — protected, owner only, subscription required */}
          <Route path="/owner-dashboard" element={
            <ProtectedRoute allowedRoles={['owner']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<OwnerDashboard />} />
            <Route path="home" element={<HomePage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="trainers" element={<TrainersPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="checkin" element={<AttendancePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="website" element={<WebsitePageRouter />} />
            <Route path="payment-settings" element={<PaymentSettingsPage />} />
            <Route path="communication" element={<CommunicationPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="programs" element={<ProgramsPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="help" element={<SupportPage />} />
            <Route path="branches" element={<BranchesPage />} />
          </Route>

          {/* Trainer dashboard — keep-alive layout handles all sub-routes internally */}
          <Route path="/trainer-dashboard/*" element={
            <ProtectedRoute allowedRoles={['trainer']}>
              <TrainerLayout />
            </ProtectedRoute>
          } />

          {/* Member app — keep-alive layout handles all sub-routes internally */}
          <Route path="/member-app/*" element={
            <ProtectedRoute allowedRoles={['member']}>
              <MemberLayout />
            </ProtectedRoute>
          } />
          {/* Public gym pages — must be LAST (dynamic :gymSlug param) */}
          <Route path="/:gymSlug" element={<GymLayout />}>
            {gymChildRoutes}
          </Route>
        </Routes>
        )}
        </Suspense>
        </ThemeProvider>
      </AuthProvider>
      </DialogProvider>
    </BrowserRouter>
  )
}
