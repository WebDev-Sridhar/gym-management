# Email Templates — Reference

**Last updated:** 2026-06-05
**Purpose:** Reference for every email Gymmobius sends. Unlike [`INTERAKT_TEMPLATES.md`](INTERAKT_TEMPLATES.md), there's nothing to submit anywhere — email templates are React-rendered HTML built at send time. This doc exists for:

- **Support / debugging** — "what does the welcome email actually look like?"
- **Copy review** — "is the payment receipt subject line clear?"
- **Future tweaks** — knowing what file to edit when copy needs to change

**Source of truth:** [`supabase/functions/_shared/emailTemplates.ts`](supabase/functions/_shared/emailTemplates.ts). Every template below is one exported function in that file. Edit there + redeploy any function that calls `sendNotification()` to roll out copy changes.

**Routing:** All emails go through [Resend](https://resend.com) via the notification engine. Gym-facing emails use the gym's `theme_color` + `logo_url` via `gymShell()`. SaaS-facing emails (owner's Gymmobius subscription) use `saasShell()` for consistent Gymmobius branding.

---

## Two delivery paths

Email templates fire in TWO scenarios:

### Path A — Email-only types

These notification types are **email-only** in [`CHANNEL_MAP`](supabase/functions/_shared/notifications.ts#L51). They never attempt WhatsApp; the engine routes directly to email.

- `payment_confirmation`
- `saas_payment_receipt`
- `member_invite`
- `trainer_invite`
- `member_registration_request`

### Path B — Email fallback for WhatsApp-primary types

These types are WhatsApp-primary, but the engine falls back to email automatically when:
- WhatsApp dispatch fails (Interakt API error)
- WhatsApp is blocked (Solo Coach plan, quota exhausted, owner disabled the channel)
- The recipient has no WhatsApp number recorded

- `payment_reminder` *(WhatsApp-primary, email fallback uses `paymentReminderEmail`)*
- `expiry_alert` *(WhatsApp-primary, email fallback uses `expiryAlertEmail`)*
- `saas_expiry_alert` *(WhatsApp-primary, email fallback uses `saasExpiryAlertEmail`)*
- `welcome` *(WhatsApp-primary, email fallback uses `welcomeEmail`)*
- `ghost_reminder` *(WhatsApp-primary, email fallback uses `ghostReminderEmail`)*
- `weekly_summary` *(WhatsApp + email, owner picks via Communication settings)*

So every notification type the engine knows about has a corresponding email template — even if email is just the fallback path.

---

## Email-only templates (Path A)

### 1. `paymentConfirmationEmail` — member receipt

**Subject:** `✓ Payment received — {Gym Name}`
**Recipient:** Member
**When sent:** After a payment row's `status` flips to `paid` (Razorpay webhook capture, owner manual mark, or UPI "I paid" confirmation).
**Shell:** `gymShell` (gym-branded with theme color + logo)
**Source:** [`emailTemplates.ts:113`](supabase/functions/_shared/emailTemplates.ts#L113)

**Body:**
> **Payment received ✓**
> Thanks Ravi — you're all set.
>
> | | |
> |---|---:|
> | Plan | Monthly Pro |
> | Amount paid | **₹1,500** |
> | Valid until | 12 Jul 2026 |
>
> Your membership at **OwnGains** is now active. See you at the gym!

---

### 2. `saasPaymentReceiptEmail` — owner SaaS receipt

**Subject:** `✓ {Plan} subscription renewed`
**Recipient:** Gym owner
**When sent:** Owner pays for their Gymmobius subscription (Razorpay webhook).
**Shell:** `saasShell` (Gymmobius brand)
**Source:** [`emailTemplates.ts:344`](supabase/functions/_shared/emailTemplates.ts#L344)

**Body:**
> **Payment received ✓**
> Thanks Sridhar — your Gymmobius subscription is active.
>
> | | |
> |---|---:|
> | Plan | Pro |
> | Amount paid | **₹1,799** |
> | Valid until | 5 Jul 2026 |
>
> Your **Pro** subscription for **OwnGains** is active. Open the owner dashboard to manage members, payments, and more.

---

### 3. `memberInviteEmail` — "you've been added to {gym}"

**Subject:** `You're invited to {Gym Name}`
**Recipient:** Member
**When sent:** Owner adds a member via the dashboard with "Send invite" checked, OR owner approves a self-registration request.
**Shell:** `gymShell`
**Source:** [`emailTemplates.ts:428`](supabase/functions/_shared/emailTemplates.ts#L428)

**Body:**
> **You've been added to OwnGains 💪**
> Hi Ravi — your gym has added you to their member roster. Set up your account to access workouts, plans, and payment links.
>
> [**Set up my account**] *(button → portal URL)*
>
> Bookmark this URL so it's always one tap away:
> https://owngains.online/join
>
> *Didn't expect this? You can safely ignore this email — no account is created until you sign up yourself.*

---

### 4. `trainerInviteEmail` — trainer onboarding

**Subject:** `You're invited to {Gym Name} as a trainer`
**Recipient:** Trainer
**When sent:** Owner invites a trainer via the Trainers page.
**Shell:** `gymShell`
**Source:** [`emailTemplates.ts:472`](supabase/functions/_shared/emailTemplates.ts#L472)

**Body:**
> **You've been invited to OwnGains as a trainer**
> Hi Priya — claim your trainer account to start managing members.
>
> [**Claim my account**] *(button → portal URL)*
>
> *Didn't expect this? You can safely ignore.*

---

### 5. `memberRegistrationRequestEmail` — owner approval queue notice

**Subject:** `New registration request — {Gym Name}`
**Recipient:** Gym owner
**When sent:** A prospective member submits the public self-registration form (`/:slug/register`).
**Shell:** `gymShell`
**Source:** [`emailTemplates.ts:428`](supabase/functions/_shared/emailTemplates.ts#L428) area (added during self-reg MVP)

**Body:**
> **New member registration request**
> Hi Sridhar — someone just filled out the registration form for OwnGains. Review their details and approve, edit, or reject from the dashboard.
>
> | | |
> |---|---|
> | **Ravi Kumar** | |
> | Phone: 9876543210 | |
> | Email: ravi@example.com | |
>
> [**Review in dashboard**] *(button → /owner-dashboard/members)*
>
> *No member account or auth login is created until you approve.*

---

## Email fallback templates (Path B — WhatsApp-primary types)

These render when WhatsApp dispatch is blocked or fails. The engine automatically retries via email — the recipient never silently misses a critical message.

### 6. `paymentReminderEmail`

**Subject:** `Payment due — {Gym Name}`
**Recipient:** Member
**When sent:** WhatsApp `payment_reminder_*` was blocked or failed (Solo Coach has WhatsApp disabled by default → all payment reminders go via email; paid plans only fall back on quota / provider errors).
**Shell:** `gymShell`
**Source:** [`emailTemplates.ts:293`](supabase/functions/_shared/emailTemplates.ts#L293)

**Body:**
> **Payment due**
> Hi Ravi — a quick reminder that your membership payment to **OwnGains** is due.
>
> | | |
> |---|---:|
> | Plan | Monthly Pro |
> | Amount due | **₹1,500** |
>
> [**Complete payment**] *(button → pay link)*
>
> *Already paid? You can ignore this — it can take a few minutes for our records to update.*

---

### 7. `expiryAlertEmail`

**Subject:** `Your {Gym} membership expires today` (day 0) OR `{Gym} — membership expires in {N} days`
**Recipient:** Member
**When sent:** Fallback for the staged `expiry_alert` notification type (not yet active in cron — see Interakt template #4).
**Shell:** `gymShell`
**Source:** [`emailTemplates.ts:318`](supabase/functions/_shared/emailTemplates.ts#L318)

**Body:**
> **Your membership expires in 3 days**
> Hi Ravi — your membership at **OwnGains** expires in 3 days. Renew now to keep your access uninterrupted.
>
> [**Renew now**] *(button → pay link)*

---

### 8. `welcomeEmail`

**Subject:** `Welcome to {Gym Name}`
**Recipient:** Member
**When sent:** After first successful payment. WhatsApp is primary; email is the fallback (or only channel for Solo Coach gyms).
**Shell:** `gymShell`
**Source:** [`emailTemplates.ts:139`](supabase/functions/_shared/emailTemplates.ts#L139)

**Body:**
> **Welcome to OwnGains 💪**
> Hi Ravi — your **Monthly Pro** membership is active.
>
> Show this email at reception on your first visit. We'll get you set up.
>
> [**Open my dashboard**] *(button → login URL)*

---

### 9. `ghostReminderEmail`

**Subject:** `We've missed you at {Gym Name}`
**Recipient:** Member (lapsed)
**When sent:** Ghost-detection cron fallback when WhatsApp is unavailable (Solo Coach → email-only by default for ghost reminders).
**Shell:** `gymShell`
**Source:** [`emailTemplates.ts:451`](supabase/functions/_shared/emailTemplates.ts#L451)

**Body:**
> **We've missed you at OwnGains 💪**
> Hi Ravi — it's been 14 days since your last check-in. Your goals are waiting; we'd love to see you back this week.
>
> [**Open my dashboard**] *(button → portal URL, optional)*

---

### 10. `saasExpiryAlertEmail`

**Subject:** `Your {Plan} subscription expires today` OR `Your {Plan} subscription expires in {N} days`
**Recipient:** Gym owner
**When sent:** SaaS-side daily cron, fallback when owner's WhatsApp number is unreachable or WA delivery fails.
**Shell:** `saasShell`
**Source:** [`emailTemplates.ts:373`](supabase/functions/_shared/emailTemplates.ts#L373)

**Body:**
> **Your subscription expires in 3 days**
> Hi Sridhar — your **Pro** subscription for **OwnGains** expires in 3 days. Renew now to keep full dashboard access without interruption.
>
> [**Renew subscription**] *(button → billing URL)*

---

### 11. `weeklySummaryEmail`

**Subject:** `Your weekly Gymmobius summary` (varies based on metrics — usually includes the gym name)
**Recipient:** Gym owner
**When sent:** Sunday 18:00 IST cron. Owner picks WhatsApp / Email / Both in Communication settings.
**Shell:** `saasShell` (owner-facing) — wait, actually uses `gymShell` since the gym brand carries the context. Confirm with source.
**Source:** [`emailTemplates.ts:160`](supabase/functions/_shared/emailTemplates.ts#L160)

**Body:** (richer than the WhatsApp version — includes WoW revenue trend, action lists for overdue/at-risk/expiring members, links into the dashboard for each section)

---

## Special case: `findMyGymEmail`

Not in the `CHANNEL_MAP` — fires from the standalone [`find-my-gym`](supabase/functions/find-my-gym/index.ts) public endpoint, not the notification engine.

**Subject:** `Your portal at {Gym Name}`
**Recipient:** Member or trainer who used the "find my gym" lookup form on the SaaS wrong-portal screen.
**When sent:** Public lookup form match — silently emails the matching user with their gym's branded URL.
**Shell:** `gymShell`
**Source:** [`emailTemplates.ts:405`](supabase/functions/_shared/emailTemplates.ts#L405)

**Anti-enumeration:** the lookup endpoint always returns 200 success regardless of whether the email matched — callers can't probe for registered emails. This email is sent ONLY when there's a real match.

---

## Reply-to address conventions

The notification engine sets `reply_to` per template type:

- **Gym-facing emails** (payment, welcome, invite, ghost recall, etc.) → `reply_to = gym.email` so members reach the gym, not a Gymmobius inbox
- **SaaS-facing emails** (saas_payment_receipt, saas_expiry_alert) → `reply_to = SAAS_REPLY_EMAIL` (Gymmobius support address)

Defined in [`notifications.ts`](supabase/functions/_shared/notifications.ts) — search for `SAAS_TYPES` and `reply_to`.

---

## Suppression model

Every email respects two gates:

1. **Member-level**: `members.unsubscribed = true` → engine returns `status='skipped'` with `suppressed_reason='member_unsubscribed'`. No email sent.
2. **Gym-level**: `gyms.email_enabled = false` → email channel filtered out before dispatch.

If both WhatsApp and email are gated/blocked, the engine writes `status='skipped'` with `suppressed_reason='channels_disabled'` — visible in the Communication page activity log.

---

## When to edit which file

| Want to change... | Edit... |
|---|---|
| Email body copy | [`emailTemplates.ts`](supabase/functions/_shared/emailTemplates.ts) — find the matching function, edit the HTML template |
| Subject line | Same file, change the `subject:` line returned by the function |
| Brand color or logo handling | `gymShell()` / `saasShell()` helpers at the top of the file |
| Add a new email type | 1. Add a new `xxxEmail()` function. 2. Wire it in `notifications.ts → sendEmailChannel` switch. 3. Add to `CHANNEL_MAP` + `NotificationType` union. |
| Make an email-only type WhatsApp-capable | Add a WhatsApp template in Interakt (per `INTERAKT_TEMPLATES.md` format) + update `CHANNEL_MAP` to `['whatsapp', 'email']` |

After any edit, redeploy every edge function that imports `_shared/notifications.ts` (the entire send chain) for the change to take effect.
