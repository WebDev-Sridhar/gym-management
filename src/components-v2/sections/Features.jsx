import { motion } from 'framer-motion'
import {
  Users, CalendarCheck, Dumbbell, CreditCard, MessageCircle, BarChart3, Smartphone, Building2, Check,
} from 'lucide-react'
import SectionContainer, { Eyebrow } from '../ui/SectionContainer'
import ScrollReveal, { fadeUp, slideInLeft, slideInRight } from '../ui/ScrollReveal'
import MobileMockup from '../ui/MobileMockup'

function PanelShell({ children, gradient }) {
  return (
    <div className={`relative rounded-2xl border border-gray-100 bg-white shadow-xl shadow-gray-200/60 p-6 overflow-hidden`}>
      <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-50 ${gradient}`} />
      <div className="relative">{children}</div>
    </div>
  )
}

function ProgressRow({ label, value, color }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
        <span>{label}</span>
        <span className="font-semibold text-gray-700">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  )
}

function MembershipVisual() {
  return (
    <PanelShell gradient="bg-indigo-200">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Membership Plans</span>
      <div className="mt-4 space-y-3">
        {[
          { name: 'Pro Annual', members: 312, color: 'bg-indigo-500' },
          { name: 'Standard Monthly', members: 480, color: 'bg-violet-400' },
          { name: 'Day Pass', members: 96, color: 'bg-sky-400' },
        ].map((plan) => (
          <div key={plan.name} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${plan.color}`} />
              <span className="text-sm font-medium text-gray-700">{plan.name}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{plan.members}</span>
          </div>
        ))}
      </div>
    </PanelShell>
  )
}

function AttendanceVisual() {
  return (
    <PanelShell gradient="bg-emerald-200">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Weekly Attendance</span>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <motion.div
              initial={{ height: 0 }}
              whileInView={{ height: `${[60, 75, 50, 90, 85, 40, 30][i]}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
              className="w-full bg-gradient-to-t from-emerald-400 to-emerald-200 rounded-md min-h-[8px]"
              style={{ height: '60px' }}
            />
            <span className="text-[10px] text-gray-400">{day}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-600">Today's check-ins</span>
        <span className="text-sm font-bold text-gray-900">214</span>
      </div>
    </PanelShell>
  )
}

function TrainerVisual() {
  return (
    <PanelShell gradient="bg-violet-200">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Trainer Roster</span>
      <div className="mt-4 space-y-3">
        {[
          { name: 'Coach Dev', sessions: 18, color: 'from-indigo-500 to-violet-500' },
          { name: 'Coach Anita', sessions: 14, color: 'from-violet-500 to-fuchsia-400' },
          { name: 'Coach Rahul', sessions: 21, color: 'from-sky-500 to-indigo-500' },
        ].map((t) => (
          <div key={t.name} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-bold`}>
              {t.name.split(' ')[1][0]}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700">{t.name}</div>
              <div className="text-[10px] text-gray-400">{t.sessions} sessions this week</div>
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  )
}

function PaymentsVisual() {
  return (
    <PanelShell gradient="bg-amber-200">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment Collection</span>
      <div className="mt-4 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 p-4 text-white shadow-lg shadow-indigo-200">
        <div className="text-[10px] uppercase tracking-wider text-indigo-100">This month</div>
        <div className="text-2xl font-bold mt-1">₹6,84,200</div>
        <div className="text-[11px] text-indigo-100 mt-1">98% collected on time</div>
      </div>
      <div className="mt-3 space-y-2">
        {[
          { label: 'UPI', value: 62 },
          { label: 'Card', value: 24 },
          { label: 'Cash', value: 14 },
        ].map((row) => (
          <ProgressRow key={row.label} label={row.label} value={row.value} color="bg-indigo-500" />
        ))}
      </div>
    </PanelShell>
  )
}

function WhatsappVisual() {
  return (
    <PanelShell gradient="bg-emerald-200">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">WhatsApp Reminders</span>
      <div className="mt-4 space-y-2">
        {[
          'Hi Rahul, your membership expires in 3 days. Renew now to keep your streak going! 💪',
          'Reminder: HIIT session with Coach Dev today at 5:30 PM.',
          'Payment of ₹2,500 received — thank you! Your receipt is ready.',
        ].map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12, duration: 0.4 }}
            className="rounded-2xl rounded-tr-sm bg-emerald-50 text-emerald-700 text-xs px-4 py-2.5 ml-auto max-w-[85%]"
          >
            {msg}
          </motion.div>
        ))}
      </div>
    </PanelShell>
  )
}

function AnalyticsVisual() {
  return (
    <PanelShell gradient="bg-sky-200">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Growth Analytics</span>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">New members</div>
          <div className="text-xl font-bold text-gray-900 mt-1">+128</div>
          <div className="text-[10px] text-emerald-500 font-semibold mt-1">↑ 22% MoM</div>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">Churn rate</div>
          <div className="text-xl font-bold text-gray-900 mt-1">2.1%</div>
          <div className="text-[10px] text-emerald-500 font-semibold mt-1">↓ 0.6% MoM</div>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <ProgressRow label="Revenue target" value={82} color="bg-sky-500" />
        <ProgressRow label="Retention goal" value={91} color="bg-indigo-500" />
      </div>
    </PanelShell>
  )
}

function MultiBranchVisual() {
  return (
    <PanelShell gradient="bg-fuchsia-200">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Branches Overview</span>
      <div className="mt-4 space-y-3">
        {[
          { name: 'Anna Nagar', members: 412, status: 'Healthy' },
          { name: 'Velachery', members: 287, status: 'Healthy' },
          { name: 'OMR', members: 156, status: 'Growing' },
        ].map((branch) => (
          <div key={branch.name} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                <Building2 size={16} />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">{branch.name}</div>
                <div className="text-[10px] text-gray-400">{branch.members} members</div>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">{branch.status}</span>
          </div>
        ))}
      </div>
    </PanelShell>
  )
}

const FEATURES = [
  {
    icon: Users,
    title: 'Membership Management',
    description: 'Create flexible plans, automate renewals, and track every member\'s status from a single, organized dashboard — no more spreadsheets or missed renewals.',
    points: ['Custom plan builder', 'Automated renewal reminders', 'Member profiles & history'],
    visual: <MembershipVisual />,
  },
  {
    icon: CalendarCheck,
    title: 'Attendance Tracking',
    description: 'QR-based check-ins give you real-time visibility into who\'s training, when, and how often — so you can spot drop-offs before they become cancellations.',
    points: ['QR check-in at the gate', 'Real-time attendance feed', 'Drop-off alerts'],
    visual: <AttendanceVisual />,
  },
  {
    icon: Dumbbell,
    title: 'Trainer Management',
    description: 'Assign sessions, track performance, and manage payouts for your entire training staff — all from one place, with full visibility into workload.',
    points: ['Session scheduling', 'Performance tracking', 'Payout management'],
    visual: <TrainerVisual />,
  },
  {
    icon: CreditCard,
    title: 'Payment Collection',
    description: 'Collect payments via UPI, card, or cash and reconcile everything automatically. Send invoices, track dues, and get paid faster — with zero manual entry.',
    points: ['UPI, card & cash support', 'Automated invoicing', 'Dues tracking & reconciliation'],
    visual: <PaymentsVisual />,
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp Reminders',
    description: 'Keep members engaged with automated WhatsApp messages for renewals, payments, and class schedules — the channel they actually read.',
    points: ['Renewal & payment reminders', 'Class schedule notifications', 'Custom broadcast messages'],
    visual: <WhatsappVisual />,
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Understand growth, retention, and revenue trends at a glance. Make data-backed decisions about plans, pricing, and staffing.',
    points: ['Revenue & growth trends', 'Retention & churn insights', 'Exportable reports'],
    visual: <AnalyticsVisual />,
  },
  {
    icon: Smartphone,
    title: 'Member App',
    description: 'Give members their own app to check in, view membership status, track schedules, and make payments — boosting engagement and reducing front-desk load.',
    points: ['Self-service check-in', 'Membership & payment status', 'Class schedules on the go'],
    visual: <MobileMockup className="mx-auto" />,
  },
  {
    icon: Building2,
    title: 'Multi-Branch Support',
    description: 'Running more than one location? Manage every branch from a unified view while keeping member data, staff, and reporting cleanly separated.',
    points: ['Unified multi-branch view', 'Per-branch reporting', 'Centralized staff management'],
    visual: <MultiBranchVisual />,
  },
]

function FeatureRow({ feature, index }) {
  const reversed = index % 2 === 1
  const Icon = feature.icon

  return (
    <div className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${index !== 0 ? 'mt-24 sm:mt-32' : ''}`}>
      <ScrollReveal variant={reversed ? slideInRight : slideInLeft} className={reversed ? 'lg:order-2' : ''}>
        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-5">
          <Icon size={22} />
        </div>
        <h3 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">{feature.title}</h3>
        <p className="mt-4 text-base text-gray-500 leading-relaxed">{feature.description}</p>
        <ul className="mt-6 space-y-2.5">
          {feature.points.map((point) => (
            <li key={point} className="flex items-center gap-3 text-sm text-gray-700">
              <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center flex-shrink-0">
                <Check size={12} />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </ScrollReveal>

      <ScrollReveal variant={reversed ? slideInLeft : slideInRight} className={reversed ? 'lg:order-1' : ''} delay={0.1}>
        {feature.visual}
      </ScrollReveal>
    </div>
  )
}

export default function Features() {
  return (
    <SectionContainer background="white" id="features">
      <div className="text-center max-w-2xl mx-auto mb-20">
        <ScrollReveal variant={fadeUp}>
          <Eyebrow>Everything in one place</Eyebrow>
          <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">
            Built for how gyms actually run
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-500 leading-relaxed">
            From the front desk to the trainer floor to your phone — every part of your gym, connected.
          </p>
        </ScrollReveal>
      </div>

      {FEATURES.map((feature, index) => (
        <FeatureRow key={feature.title} feature={feature} index={index} />
      ))}
    </SectionContainer>
  )
}
