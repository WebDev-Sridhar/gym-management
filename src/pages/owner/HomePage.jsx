import { Link } from 'react-router-dom'
import {
  Users,
  CreditCard,
  Globe,
  UserPlus,
  ShieldCheck,
  ArrowRight,
  ClipboardList,
  CheckCircle2,
  Sparkles,
  BellRing,
  LayoutDashboard,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '../../store/AuthContext'

export default function HomePage() {
  const { gymName: rawGymName } = useAuth()
  const gymName = rawGymName || 'My Gym'

  const setupSteps = [
    {
      title: 'Setup Your Gym Website',
      desc: 'Add your gym branding, hero section, pricing plans, gallery, and contact details to launch your public website.',
      icon: Globe,
      link: '/owner-dashboard/website',
      button: 'Customize Website',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'Configure Payment System',
      desc: 'Connect Razorpay to start collecting membership payments directly from your members online.',
      icon: CreditCard,
      link: '/owner-dashboard/payment-settings',
      button: 'Setup Payments',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Add Members & Trainers',
      desc: 'Create member and trainer accounts, assign plans, manage access, and start tracking attendance.',
      icon: Users,
      link: '/owner-dashboard/members',
      button: 'Manage Members',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
  ]

  const quickActions = [
    {
      title: 'Add Member',
      desc: 'Register a new gym member',
      icon: UserPlus,
      link: '/owner-dashboard/members',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'Add Trainer',
      desc: 'Onboard a new trainer',
      icon: UserCheck,
      link: '/owner-dashboard/trainers',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Setup Plans',
      desc: 'Create membership plans',
      icon: ClipboardList,
      link: '/owner-dashboard/plans',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'Notifications',
      desc: 'Manage alert settings',
      icon: BellRing,
      link: '/owner-dashboard/communication',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
  ]

  const platformStatus = [
    'Gym website is connected and live',
    'Payment gateway configuration available',
    'Member management system active',
    'Attendance & trainer modules enabled',
  ]

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">

      {/* ───────── HERO ───────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Gymmobius Owner Workspace
            </div>
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">
              Welcome back,{' '}
              <span className="text-indigo-600">{gymName}</span>
            </h1>
            <p className="text-sm text-gray-500 mt-2 max-w-xl leading-relaxed">
              Manage your gym operations, members, payments, trainers, and website —
              all from one centralized platform built for modern fitness businesses.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              to="/owner-dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              Open Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/owner-dashboard/website"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Customize Website
            </Link>
          </div>
        </div>
      </div>

      {/* ───────── SETUP SECTION ───────── */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Complete Your Setup</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Finish these important steps to unlock the full Gymmobius experience.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {setupSteps.map((item, index) => {
            const Icon = item.icon
            return (
              <div
                key={index}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-300 hover:shadow-sm transition-all group"
              >
                <div className={`w-11 h-11 rounded-xl ${item.iconBg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${item.iconColor}`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                <Link
                  to={item.link}
                  className="inline-flex items-center gap-1.5 mt-5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {item.button}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )
          })}
        </div>
      </div>

      {/* ───────── QUICK ACTIONS ───────── */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Quick Actions</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Frequently used shortcuts for managing your gym.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((item, index) => {
            const Icon = item.icon
            return (
              <Link
                key={index}
                to={item.link}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all group flex flex-col"
              >
                <div className={`w-10 h-10 rounded-lg ${item.iconBg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4.5 h-4.5 ${item.iconColor}`} />
                </div>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ───────── PLATFORM INFO ───────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Platform Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-semibold text-gray-900">Your Platform Status</h2>
          </div>
          <div className="space-y-3">
            {platformStatus.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-600">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA card */}
        <div className="bg-indigo-600 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-medium mb-4">
              Premium Experience
            </span>
            <h2 className="text-xl font-bold text-white leading-snug max-w-xs">
              Build a modern digital experience for your gym members.
            </h2>
            <p className="text-sm text-indigo-100 mt-3 leading-relaxed max-w-sm">
              Use Gymmobius to manage memberships, automate operations,
              create a premium website, collect payments online, and scale
              your fitness business professionally.
            </p>
          </div>
          <Link
            to="/owner-dashboard/website"
            className="inline-flex items-center gap-2 mt-6 px-4 py-2.5 bg-white text-indigo-700 font-semibold text-sm rounded-lg hover:bg-indigo-50 transition-colors w-fit"
          >
            Open Website Builder
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  )
}