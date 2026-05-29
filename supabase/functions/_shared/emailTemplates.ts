// Inline HTML email templates. Pure functions — return { subject, html }.
// No external image deps so they render in every client. Brand color is the
// gym's theme_color (falls back to violet).

interface GymCtx {
  name?: string | null
  theme_color?: string | null
}

function shell(brand: string, body: string): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Gymmobius</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.04);">
        <tr><td style="background:${brand};padding:18px 24px;color:#fff;font-weight:700;font-size:14px;letter-spacing:1px;">Gymmobius</td></tr>
        <tr><td style="padding:28px 28px 32px;color:#1f2937;font-size:15px;line-height:1.6;">
          ${body}
        </td></tr>
        <tr><td style="background:#fafafa;padding:14px 24px;color:#9ca3af;font-size:12px;border-top:1px solid #f0f0f0;">
          You received this because you have an account on Gymmobius. Reply to this email if you need help.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function btn(url: string, label: string, brand: string): string {
  return `<a href="${url}" style="display:inline-block;background:${brand};color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${label}</a>`
}

function safe(s: string | null | undefined, fallback = ''): string {
  if (s == null) return fallback
  return String(s).replace(/[<>&]/g, (c) => c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;')
}

// ─── Templates ──────────────────────────────────────────────────────────────

export function paymentConfirmationEmail(args: {
  memberName: string
  planName: string
  amount: number
  expiresAt?: string | null
  gym: GymCtx
}): { subject: string; html: string } {
  const brand = args.gym.theme_color || '#8B5CF6'
  const gymName = safe(args.gym.name, 'Your gym')
  const expiry = args.expiresAt
    ? new Date(args.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const body = `
    <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:6px;">Payment received ✓</div>
    <div style="color:#6b7280;margin-bottom:22px;">Thanks ${safe(args.memberName)} — you're all set.</div>
    <table role="presentation" width="100%" style="background:#f9fafb;border:1px solid #f0f0f0;border-radius:10px;padding:18px;margin-bottom:22px;">
      <tr><td style="color:#6b7280;font-size:13px;padding-bottom:6px;">Plan</td><td align="right" style="color:#111827;font-weight:600;">${safe(args.planName)}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding-bottom:6px;">Amount paid</td><td align="right" style="color:${brand};font-weight:700;font-size:18px;">₹${Number(args.amount).toLocaleString('en-IN')}</td></tr>
      ${expiry ? `<tr><td style="color:#6b7280;font-size:13px;">Valid until</td><td align="right" style="color:#111827;font-weight:600;">${expiry}</td></tr>` : ''}
    </table>
    <div style="color:#374151;">Your membership at <b>${gymName}</b> is now active. See you at the gym!</div>
  `
  return { subject: `✓ Payment received — ${gymName}`, html: shell(brand, body) }
}

export function welcomeEmail(args: {
  memberName: string
  planName: string
  gym: GymCtx
  loginUrl?: string
}): { subject: string; html: string } {
  const brand = args.gym.theme_color || '#8B5CF6'
  const gymName = safe(args.gym.name, 'your gym')
  const body = `
    <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:6px;">Welcome to ${gymName} 💪</div>
    <div style="color:#6b7280;margin-bottom:22px;">Hi ${safe(args.memberName)} — your <b>${safe(args.planName)}</b> membership is active.</div>
    <div style="color:#374151;margin-bottom:22px;">Show this email at reception on your first visit. We'll get you set up.</div>
    ${args.loginUrl ? btn(args.loginUrl, 'Open my dashboard', brand) : ''}
  `
  return { subject: `Welcome to ${gymName}`, html: shell(brand, body) }
}

export function dailySummaryEmail(args: {
  ownerName: string
  gym: GymCtx
  pendingCount: number
  pendingAmount: number
  expiringCount: number
  revenueToday: number
}): { subject: string; html: string } {
  const brand = args.gym.theme_color || '#8B5CF6'
  const gymName = safe(args.gym.name, 'Your gym')
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  const body = `
    <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:6px;">Daily summary — ${date}</div>
    <div style="color:#6b7280;margin-bottom:22px;">Good morning ${safe(args.ownerName)}, here's what's happening at <b>${gymName}</b>.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr>
        <td width="33%" style="background:#fef3c7;padding:14px;border-radius:10px;text-align:center;">
          <div style="font-size:12px;color:#78350f;text-transform:uppercase;letter-spacing:0.5px;">Pending</div>
          <div style="font-size:22px;font-weight:700;color:#92400e;margin-top:4px;">${args.pendingCount}</div>
          <div style="font-size:12px;color:#92400e;">₹${Number(args.pendingAmount).toLocaleString('en-IN')}</div>
        </td>
        <td width="6"></td>
        <td width="33%" style="background:#fee2e2;padding:14px;border-radius:10px;text-align:center;">
          <div style="font-size:12px;color:#7f1d1d;text-transform:uppercase;letter-spacing:0.5px;">Expiring</div>
          <div style="font-size:22px;font-weight:700;color:#991b1b;margin-top:4px;">${args.expiringCount}</div>
          <div style="font-size:12px;color:#991b1b;">in 3 days</div>
        </td>
        <td width="6"></td>
        <td width="33%" style="background:#d1fae5;padding:14px;border-radius:10px;text-align:center;">
          <div style="font-size:12px;color:#064e3b;text-transform:uppercase;letter-spacing:0.5px;">Revenue</div>
          <div style="font-size:22px;font-weight:700;color:#065f46;margin-top:4px;">₹${Number(args.revenueToday).toLocaleString('en-IN')}</div>
          <div style="font-size:12px;color:#065f46;">today</div>
        </td>
      </tr>
    </table>
    <div style="color:#6b7280;font-size:13px;">Open the Gymmobius dashboard for full details.</div>
  `
  return { subject: `📊 ${gymName} — daily summary`, html: shell(brand, body) }
}

// SaaS subscription receipt — owner-facing version of paymentConfirmationEmail.
// Same structure but the closing line talks about dashboard access, not
// "see you at the gym" (the owner is the customer here, not a member).
export function saasPaymentReceiptEmail(args: {
  ownerName: string
  planName: string
  amount: number
  expiresAt?: string | null
  gymName?: string | null
}): { subject: string; html: string } {
  const brand = '#6366f1'   // platform indigo — SaaS receipts aren't gym-branded
  const planName = safe(args.planName, 'Gymmobius')
  const gymName  = safe(args.gymName, 'your gym')
  const expiry = args.expiresAt
    ? new Date(args.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const body = `
    <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:6px;">Payment received ✓</div>
    <div style="color:#6b7280;margin-bottom:22px;">Thanks ${safe(args.ownerName)} — your Gymmobius subscription is active.</div>
    <table role="presentation" width="100%" style="background:#f9fafb;border:1px solid #f0f0f0;border-radius:10px;padding:18px;margin-bottom:22px;">
      <tr><td style="color:#6b7280;font-size:13px;padding-bottom:6px;">Plan</td><td align="right" style="color:#111827;font-weight:600;">${planName}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding-bottom:6px;">Amount paid</td><td align="right" style="color:${brand};font-weight:700;font-size:18px;">₹${Number(args.amount).toLocaleString('en-IN')}</td></tr>
      ${expiry ? `<tr><td style="color:#6b7280;font-size:13px;">Valid until</td><td align="right" style="color:#111827;font-weight:600;">${expiry}</td></tr>` : ''}
    </table>
    <div style="color:#374151;">Your <b>${planName}</b> subscription for <b>${gymName}</b> is active. Open the owner dashboard to manage members, payments, and more.</div>
  `
  return { subject: `✓ ${planName} subscription renewed`, html: shell(brand, body) }
}

// Phase 5 find-my-gym lookup. Sent from the public /functions/v1/find-my-gym
// endpoint when a member or trainer can't remember their gym's branded URL
// and uses the lookup form on the SaaS wrong-portal screen. Anti-enumeration:
// we send the email only when there's a matching record, but the API always
// returns success either way so callers can't probe for registered emails.
export function findMyGymEmail(args: {
  gym: GymCtx
  portalUrl: string
}): { subject: string; html: string } {
  const brand = args.gym.theme_color || '#8B5CF6'
  const gymName = safe(args.gym.name, 'your gym')
  const body = `
    <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:6px;">Your gym portal</div>
    <div style="color:#6b7280;margin-bottom:22px;">You asked us to look up your gym on Gymmobius — here's the branded portal for <b>${gymName}</b>.</div>
    ${btn(args.portalUrl, `Sign in to ${gymName}`, brand)}
    <div style="color:#6b7280;font-size:13px;margin-top:22px;">Bookmark this URL so you don't lose it:</div>
    <div style="color:${brand};font-size:13px;word-break:break-all;margin-top:4px;"><a href="${args.portalUrl}" style="color:${brand};text-decoration:underline;">${args.portalUrl}</a></div>
    <div style="color:#9ca3af;font-size:12px;margin-top:22px;">Didn't request this? You can safely ignore this email — no changes were made to your account.</div>
  `
  return { subject: `Your Gymmobius gym portal — ${gymName}`, html: shell(brand, body) }
}

// Audit C5 — member invite. Sent when an owner clicks "Send invite" on a
// just-created (or any inactive) member to onboard them onto the member
// app. Distinct from `welcomeEmail`, which fires AFTER a successful payment
// ("your membership is active"); this one fires BEFORE that — "your gym
// added you; click to set up your account". Branded with the gym's
// theme_color so members recognise the sender.
export function memberInviteEmail(args: {
  memberName: string
  gym: GymCtx
  portalUrl: string
}): { subject: string; html: string } {
  const brand = args.gym.theme_color || '#8B5CF6'
  const gymName = safe(args.gym.name, 'your gym')
  const body = `
    <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:6px;">You've been added to ${gymName} 💪</div>
    <div style="color:#6b7280;margin-bottom:22px;">Hi ${safe(args.memberName)} — your gym has added you to their member roster. Set up your account to access workouts, plans, and payment links.</div>
    ${btn(args.portalUrl, `Set up my account`, brand)}
    <div style="color:#6b7280;font-size:13px;margin-top:22px;">Bookmark this URL so it's always one tap away:</div>
    <div style="color:${brand};font-size:13px;word-break:break-all;margin-top:4px;"><a href="${args.portalUrl}" style="color:${brand};text-decoration:underline;">${args.portalUrl}</a></div>
    <div style="color:#9ca3af;font-size:12px;margin-top:22px;">Didn't expect this? Reply to this email or ignore it — no account is created until you sign up yourself.</div>
  `
  return { subject: `You're invited to ${gymName}`, html: shell(brand, body) }
}

// Audit C6 — ghost recall. Sent by the daily ghost-detection cron when a
// member hasn't checked in for N consecutive days. Soft "we miss you"
// tone — the goal is to bring lapsed members back into the gym, not to
// chase a payment. Branded with gym.theme_color so members recognise it
// instantly.
export function ghostReminderEmail(args: {
  memberName: string
  daysInactive: number
  gym: GymCtx
  portalUrl?: string
}): { subject: string; html: string } {
  const brand = args.gym.theme_color || '#8B5CF6'
  const gymName = safe(args.gym.name, 'your gym')
  const body = `
    <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:6px;">We've missed you at ${gymName} 💪</div>
    <div style="color:#6b7280;margin-bottom:22px;">Hi ${safe(args.memberName)} — it's been ${args.daysInactive} days since your last check-in. Your goals are waiting; we'd love to see you back this week.</div>
    ${args.portalUrl ? btn(args.portalUrl, `Open my dashboard`, brand) : ''}
    <div style="color:#6b7280;font-size:13px;margin-top:22px;">Not feeling it this week? Reply to this email and let your trainer know — they can help you plan your comeback.</div>
  `
  return { subject: `We've missed you at ${gymName}`, html: shell(brand, body) }
}

// Audit C4 — trainer invite. Sent when an owner adds a trainer via the
// Trainers page. The trainer has a `trainer_invites` row keyed by email;
// linkInviteOrMember claims it at signup. This email tells them where to
// sign up. Token-bearing link is a Phase 2 enhancement — for now we rely
// on the email-match claim flow already in place.
export function trainerInviteEmail(args: {
  trainerName: string
  gym: GymCtx
  portalUrl: string
}): { subject: string; html: string } {
  const brand = args.gym.theme_color || '#8B5CF6'
  const gymName = safe(args.gym.name, 'your gym')
  const body = `
    <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:6px;">You're invited as a trainer at ${gymName}</div>
    <div style="color:#6b7280;margin-bottom:22px;">Hi ${safe(args.trainerName)} — the gym has added you to their trainer roster. Sign up on the gym's portal to claim your trainer account and start managing members.</div>
    ${btn(args.portalUrl, `Claim my trainer account`, brand)}
    <div style="color:#6b7280;font-size:13px;margin-top:22px;">Use this URL to sign up:</div>
    <div style="color:${brand};font-size:13px;word-break:break-all;margin-top:4px;"><a href="${args.portalUrl}" style="color:${brand};text-decoration:underline;">${args.portalUrl}</a></div>
    <div style="color:#9ca3af;font-size:12px;margin-top:22px;">Important: sign up with this same email address so we can link your invite. Didn't expect this? You can safely ignore — no account is created until you sign up.</div>
  `
  return { subject: `You're invited as a trainer at ${gymName}`, html: shell(brand, body) }
}
