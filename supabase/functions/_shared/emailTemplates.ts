// Inline HTML email templates. Pure functions — return { subject, html }.
// Two visual shells:
//   - gymShell: gym-branded (gym name in header, gym.theme_color, gym email
//     as the reply contact). Used for every member-facing and owner-facing
//     gym-business email — payment receipts, reminders, invites, etc.
//   - saasShell: platform-branded (Gymmobius logo + name, platform indigo,
//     SaaS support email as the reply contact). Used for SaaS-side emails —
//     subscription receipts and renewal alerts.
//
// "From" addresses are configured in resend.ts (RESEND_FROM env var,
// default `Gymmobius <noreply@gymmobius.com>`). Since the noreply mailbox
// is unmonitored, every email sets reply_to via the notification engine so
// human replies land somewhere real:
//   - gym emails    → gym.email
//   - SaaS emails   → SAAS_SUPPORT_EMAIL below
// Both shells also call this out in the footer so users don't waste a reply
// to noreply@gymmobius.com.

interface GymCtx {
  name?: string | null
  theme_color?: string | null
  email?: string | null   // Used as reply contact in the gym-shell footer
}

// SaaS-side constants. Logo is fetched by the recipient's email client, so
// it MUST be served on a public, https URL. Keep the asset stable — email
// clients cache logos aggressively and a 404 leaves a broken-image icon.
const SAAS_LOGO_URL = Deno.env.get('SAAS_LOGO_URL')
  ?? 'https://gymmobius.com/logo.png'
const SAAS_SUPPORT_EMAIL = Deno.env.get('SAAS_SUPPORT_EMAIL')
  ?? 'gymmobius.support@gmail.com'
const SAAS_BRAND_NAME  = 'Gymmobius'
const SAAS_BRAND_COLOR = '#6366f1'   // platform indigo

function safe(s: string | null | undefined, fallback = ''): string {
  if (s == null) return fallback
  return String(s).replace(/[<>&]/g, (c) => c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;')
}

function btn(url: string, label: string, brand: string): string {
  return `<a href="${url}" style="display:inline-block;background:${brand};color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${label}</a>`
}

// Gym-branded shell. Header = gym name on the gym's theme color. Footer
// surfaces the gym's own email so members reach the gym, not the SaaS.
// If gym.email is missing we omit the "contact" line entirely rather than
// invite a reply to the noreply mailbox.
function gymShell(gym: GymCtx, body: string): string {
  const brand   = gym.theme_color || '#8B5CF6'
  const gymName = safe(gym.name, 'Your gym')
  const gymEmail = gym.email ? safe(gym.email) : null
  const footer = gymEmail
    ? `Replies to this email aren't monitored. For help, contact <b>${gymName}</b> at <a href="mailto:${gymEmail}" style="color:${brand};text-decoration:none;">${gymEmail}</a>.`
    : `Replies to this email aren't monitored. Please contact your gym directly for help.`
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${gymName}</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.04);">
        <tr><td style="background:${brand};padding:18px 24px;color:#fff;font-weight:700;font-size:15px;letter-spacing:0.5px;">${gymName}</td></tr>
        <tr><td style="padding:28px 28px 32px;color:#1f2937;font-size:15px;line-height:1.6;">
          ${body}
        </td></tr>
        <tr><td style="background:#fafafa;padding:14px 24px;color:#9ca3af;font-size:12px;border-top:1px solid #f0f0f0;line-height:1.5;">
          ${footer}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

// SaaS-branded shell. Header = Gymmobius logo + name on platform indigo.
// Footer routes replies to gymmobius.support@gmail.com.
//
// Logo is rendered via <img> with explicit width/height because Outlook
// ignores CSS dimensions on images. vertical-align:middle keeps the logo
// aligned with the wordmark across the major clients.
function saasShell(body: string): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${SAAS_BRAND_NAME}</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.04);">
        <tr><td style="background:${SAAS_BRAND_COLOR};padding:18px 24px;color:#fff;">
          <img src="${SAAS_LOGO_URL}" alt="" width="22" height="22" style="vertical-align:middle;display:inline-block;border:0;margin-right:10px;border-radius:5px;"/>
          <span style="vertical-align:middle;font-weight:700;font-size:15px;letter-spacing:0.5px;">${SAAS_BRAND_NAME}</span>
        </td></tr>
        <tr><td style="padding:28px 28px 32px;color:#1f2937;font-size:15px;line-height:1.6;">
          ${body}
        </td></tr>
        <tr><td style="background:#fafafa;padding:14px 24px;color:#9ca3af;font-size:12px;border-top:1px solid #f0f0f0;line-height:1.5;">
          Replies to this email aren't monitored. For support, email
          <a href="mailto:${SAAS_SUPPORT_EMAIL}" style="color:${SAAS_BRAND_COLOR};text-decoration:none;">${SAAS_SUPPORT_EMAIL}</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

// Re-export the reply-contact constants so the notification engine can use
// them for the Resend `reply_to` field. Keeping these in one file means a
// future support-email change touches one place.
export const SAAS_REPLY_EMAIL = SAAS_SUPPORT_EMAIL

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
  return { subject: `✓ Payment received — ${gymName}`, html: gymShell(args.gym, body) }
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
  return { subject: `Welcome to ${gymName}`, html: gymShell(args.gym, body) }
}

// V3 weekly rewrite (2026-06-02): Sunday-evening owner digest. Replaces the
// thin "today only" daily that didn't carry decision-grade info. Shows
// week-over-week revenue trend + action lists (overdue pending payments,
// at-risk ghost cohort, members expiring next week).
export function weeklySummaryEmail(args: {
  ownerName: string
  gym: GymCtx
  periodStart?: string
  periodEnd?: string
  newMembersCount: number
  expiringCount: number
  expiringList?: Array<{ name: string; expiryDate: string }>
  revenueThisWeek: number
  revenueLastWeek: number
  revenueDelta?: number | null    // % change vs last week; null when last week was 0
  pendingOldList?: Array<{ name: string; amount: number; ageDays: number }>
  pendingOldTotal?: number
  newGhostsCount: number
  newGhostsList?: Array<{ name: string; lastCheckin: string }>
  whatsappUsed?: number | null
  whatsappCap?: number | null
}): { subject: string; html: string } {
  const gymName = safe(args.gym.name, 'Your gym')
  const brand   = args.gym.theme_color || '#8B5CF6'
  const weekRange = args.periodStart && args.periodEnd
    ? `${formatShortDate(args.periodStart)} – ${formatShortDate(args.periodEnd)}`
    : 'this week'

  const deltaPill = (() => {
    if (args.revenueDelta === null || args.revenueDelta === undefined) {
      return `<span style="color:#6b7280;font-size:12px;">first week tracked</span>`
    }
    const isUp = args.revenueDelta >= 0
    const bg   = isUp ? '#d1fae5' : '#fee2e2'
    const fg   = isUp ? '#065f46' : '#991b1b'
    const arrow = isUp ? '▲' : '▼'
    return `<span style="background:${bg};color:${fg};font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;">${arrow} ${Math.abs(args.revenueDelta)}% vs last week</span>`
  })()

  const expiringSection = (args.expiringList && args.expiringList.length > 0) ? `
    <div style="margin-top:18px;">
      <div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;">Expiring next 7 days (${args.expiringCount})</div>
      <table role="presentation" width="100%" style="background:#fef3c7;border-radius:10px;padding:12px;">
        ${args.expiringList.slice(0, 5).map(m => `
          <tr>
            <td style="font-size:13px;color:#78350f;padding:3px 0;">${safe(m.name)}</td>
            <td align="right" style="font-size:12px;color:#92400e;font-weight:600;">${formatShortDate(m.expiryDate)}</td>
          </tr>
        `).join('')}
        ${args.expiringList.length > 5 ? `<tr><td colspan="2" style="font-size:11px;color:#92400e;padding-top:6px;font-style:italic;">+ ${args.expiringList.length - 5} more</td></tr>` : ''}
      </table>
    </div>
  ` : ''

  const pendingSection = (args.pendingOldList && args.pendingOldList.length > 0) ? `
    <div style="margin-top:18px;">
      <div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;">⚠ Pending ≥ 7 days — needs a call</div>
      <table role="presentation" width="100%" style="background:#fee2e2;border-radius:10px;padding:12px;">
        ${args.pendingOldList.map(p => `
          <tr>
            <td style="font-size:13px;color:#7f1d1d;padding:3px 0;">${safe(p.name)} <span style="color:#991b1b;font-size:11px;">· ${p.ageDays}d old</span></td>
            <td align="right" style="font-size:12px;color:#991b1b;font-weight:600;">₹${Number(p.amount).toLocaleString('en-IN')}</td>
          </tr>
        `).join('')}
        ${args.pendingOldTotal && args.pendingOldList.length > 1 ? `
          <tr><td colspan="2" style="border-top:1px solid #fecaca;padding-top:6px;font-size:12px;color:#7f1d1d;font-weight:700;">
            Total: ₹${Number(args.pendingOldTotal).toLocaleString('en-IN')}
          </td></tr>
        ` : ''}
      </table>
    </div>
  ` : ''

  const ghostSection = (args.newGhostsList && args.newGhostsList.length > 0) ? `
    <div style="margin-top:18px;">
      <div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;">At risk — newly inactive this week (${args.newGhostsCount})</div>
      <table role="presentation" width="100%" style="background:#f3f4f6;border-radius:10px;padding:12px;">
        ${args.newGhostsList.slice(0, 5).map(g => `
          <tr>
            <td style="font-size:13px;color:#374151;padding:3px 0;">${safe(g.name)}</td>
            <td align="right" style="font-size:12px;color:#6b7280;">last seen ${formatShortDate(g.lastCheckin)}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  ` : ''

  const quotaSection = (args.whatsappCap && args.whatsappCap > 0) ? `
    <div style="margin-top:18px;font-size:12px;color:#6b7280;text-align:center;padding-top:14px;border-top:1px solid #f0f0f0;">
      WhatsApp this period: <b style="color:#374151;">${args.whatsappUsed ?? 0} / ${args.whatsappCap}</b>
      ${(args.whatsappUsed ?? 0) / args.whatsappCap >= 0.8 ? `<span style="color:#92400e;font-weight:600;"> · approaching cap</span>` : ''}
    </div>
  ` : ''

  const body = `
    <div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Weekly recap · ${weekRange}</div>
    <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:6px;">Hi ${safe(args.ownerName)},</div>
    <div style="color:#6b7280;margin-bottom:22px;">Here's how <b>${gymName}</b> did this week.</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
      <tr>
        <td width="48%" style="background:#f9fafb;padding:16px;border-radius:10px;">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Revenue this week</div>
          <div style="font-size:24px;font-weight:700;color:${brand};margin-top:4px;">₹${Number(args.revenueThisWeek).toLocaleString('en-IN')}</div>
          <div style="margin-top:6px;">${deltaPill}</div>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background:#f9fafb;padding:16px;border-radius:10px;">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">New joins</div>
          <div style="font-size:24px;font-weight:700;color:#0f172a;margin-top:4px;">${args.newMembersCount}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:6px;">${args.newMembersCount === 1 ? 'member' : 'members'} this week</div>
        </td>
      </tr>
    </table>

    ${pendingSection}
    ${expiringSection}
    ${ghostSection}
    ${quotaSection}

    <div style="color:#6b7280;font-size:13px;margin-top:22px;">Open the Gymmobius dashboard for the full picture.</div>
  `
  return { subject: `📊 ${gymName} — weekly recap (${weekRange})`, html: gymShell(args.gym, body) }
}

// Helper for the weekly email date formatting. Defined here (not exported)
// because it's only useful inside the template.
function formatShortDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// Payment reminder. Was previously an inline <p>...</p> in notifications.ts
// with no shell, no gym name, no consistent styling. Now matches the rest:
// gym-branded header, structured plan/amount summary, prominent pay CTA.
export function paymentReminderEmail(args: {
  memberName: string
  planName: string
  amount: number
  payLink?: string | null
  gym: GymCtx
}): { subject: string; html: string } {
  const brand = args.gym.theme_color || '#8B5CF6'
  const gymName = safe(args.gym.name, 'Your gym')
  const body = `
    <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:6px;">Payment due</div>
    <div style="color:#6b7280;margin-bottom:22px;">Hi ${safe(args.memberName)} — a quick reminder that your membership payment to <b>${gymName}</b> is due.</div>
    <table role="presentation" width="100%" style="background:#f9fafb;border:1px solid #f0f0f0;border-radius:10px;padding:18px;margin-bottom:22px;">
      <tr><td style="color:#6b7280;font-size:13px;padding-bottom:6px;">Plan</td><td align="right" style="color:#111827;font-weight:600;">${safe(args.planName)}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;">Amount due</td><td align="right" style="color:${brand};font-weight:700;font-size:18px;">₹${Number(args.amount).toLocaleString('en-IN')}</td></tr>
    </table>
    ${args.payLink ? btn(args.payLink, 'Complete payment', brand) : ''}
    <div style="color:#6b7280;font-size:13px;margin-top:22px;">Already paid? You can ignore this — it can take a few minutes for our records to update.</div>
  `
  return { subject: `Payment due — ${gymName}`, html: gymShell(args.gym, body) }
}

// Member-facing membership expiry. Sent by the daily cron 3/1/0 days before
// expiry_date. Companion to paymentReminderEmail but framed around the
// expiring date rather than a specific due amount.
export function expiryAlertEmail(args: {
  memberName: string
  daysLeft: number
  payLink?: string | null
  gym: GymCtx
}): { subject: string; html: string } {
  const brand = args.gym.theme_color || '#8B5CF6'
  const gymName = safe(args.gym.name, 'your gym')
  const expiryText = args.daysLeft === 0
    ? 'expires today'
    : `expires in ${args.daysLeft} day${args.daysLeft !== 1 ? 's' : ''}`
  const body = `
    <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:6px;">Your membership ${expiryText}</div>
    <div style="color:#6b7280;margin-bottom:22px;">Hi ${safe(args.memberName)} — your membership at <b>${gymName}</b> ${expiryText}. Renew now to keep your access uninterrupted.</div>
    ${args.payLink ? btn(args.payLink, 'Renew now', brand) : ''}
  `
  const subject = args.daysLeft === 0
    ? `Your ${gymName} membership expires today`
    : `${gymName} — membership expires in ${args.daysLeft} day${args.daysLeft !== 1 ? 's' : ''}`
  return { subject, html: gymShell(args.gym, body) }
}

// SaaS subscription receipt — owner-facing version of paymentConfirmationEmail.
// Same structure but the closing line talks about dashboard access, not
// "see you at the gym" (the owner is the customer here, not a member).
// Renders in saasShell so it carries the Gymmobius brand + logo.
export function saasPaymentReceiptEmail(args: {
  ownerName: string
  planName: string
  amount: number
  expiresAt?: string | null
  gymName?: string | null
}): { subject: string; html: string } {
  const brand = SAAS_BRAND_COLOR
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
  return { subject: `✓ ${planName} subscription renewed`, html: saasShell(body) }
}

// SaaS subscription expiry — was previously inline HTML in notifications.ts
// with no shell. Now uses saasShell for brand consistency with the receipt.
export function saasExpiryAlertEmail(args: {
  ownerName: string
  planName: string
  daysLeft: number
  gymName?: string | null
  billingUrl?: string | null
}): { subject: string; html: string } {
  const brand = SAAS_BRAND_COLOR
  const planName = safe(args.planName, 'Gymmobius')
  const gymName  = safe(args.gymName, 'your gym')
  const expiryText = args.daysLeft === 0
    ? 'expires today'
    : `expires in ${args.daysLeft} day${args.daysLeft !== 1 ? 's' : ''}`
  const body = `
    <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:6px;">Your subscription ${expiryText}</div>
    <div style="color:#6b7280;margin-bottom:22px;">Hi ${safe(args.ownerName)} — your <b>${planName}</b> subscription for <b>${gymName}</b> ${expiryText}. Renew now to keep full dashboard access without interruption.</div>
    ${args.billingUrl ? btn(args.billingUrl, 'Renew subscription', brand) : ''}
  `
  const subject = args.daysLeft === 0
    ? `Your ${planName} subscription expires today`
    : `Your ${planName} subscription expires in ${args.daysLeft} day${args.daysLeft !== 1 ? 's' : ''}`
  return { subject, html: saasShell(body) }
}

// Phase 5 find-my-gym lookup. Sent from the public /functions/v1/find-my-gym
// endpoint when a member or trainer can't remember their gym's branded URL
// and uses the lookup form on the SaaS wrong-portal screen. Anti-enumeration:
// we send the email only when there's a matching record, but the API always
// returns success either way so callers can't probe for registered emails.
//
// Uses gymShell (not saas) — the recipient cares about reaching their gym,
// and the gym's branding makes it instantly recognisable.
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
  return { subject: `Your Gymmobius gym portal — ${gymName}`, html: gymShell(args.gym, body) }
}

// Audit C5 — member invite. Sent when an owner clicks "Send invite" on a
// just-created (or any inactive) member to onboard them onto the member
// app. Distinct from `welcomeEmail`, which fires AFTER a successful payment
// ("your membership is active"); this one fires BEFORE that — "your gym
// added you; click to set up your account". Branded with the gym's
// theme_color so members recognise the sender.
// Owner-facing — fires when a prospective member submits the public
// self-registration form (/:slug/register). Contains the member's details
// + a one-click link to the dashboard pending-approvals section.
export function memberRegistrationRequestEmail(args: {
  ownerName?: string
  memberName: string
  memberPhone: string
  memberEmail: string
  gym: GymCtx
  dashboardUrl: string
}): { subject: string; html: string } {
  const brand = args.gym.theme_color || '#8B5CF6'
  const gymName = safe(args.gym.name, 'your gym')
  const body = `
    <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:6px;">New member registration request</div>
    <div style="color:#6b7280;margin-bottom:22px;">Hi ${safe(args.ownerName, 'there')} — someone just filled out the registration form for ${gymName}. Review their details and approve, edit, or reject from the dashboard.</div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:22px;">
      <div style="font-size:14px;color:#0f172a;margin-bottom:6px;"><strong>${safe(args.memberName)}</strong></div>
      <div style="font-size:13px;color:#6b7280;">Phone: ${safe(args.memberPhone)}</div>
      <div style="font-size:13px;color:#6b7280;">Email: ${safe(args.memberEmail)}</div>
    </div>
    ${btn(args.dashboardUrl, 'Review in dashboard', brand)}
    <div style="color:#9ca3af;font-size:12px;margin-top:22px;">No member account or auth login is created until you approve.</div>
  `
  return { subject: `New registration request — ${gymName}`, html: gymShell(args.gym, body) }
}

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
    <div style="color:#9ca3af;font-size:12px;margin-top:22px;">Didn't expect this? You can safely ignore this email — no account is created until you sign up yourself.</div>
  `
  return { subject: `You're invited to ${gymName}`, html: gymShell(args.gym, body) }
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
  `
  return { subject: `We've missed you at ${gymName}`, html: gymShell(args.gym, body) }
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
    <div style="color:#9ca3af;font-size:12px;margin-top:22px;">Important: sign up with this same email address so we can link your invite.</div>
  `
  return { subject: `You're invited as a trainer at ${gymName}`, html: gymShell(args.gym, body) }
}
