# Interakt WhatsApp Templates — Copy-Paste Ready

**Last updated:** 2026-06-05
**Purpose:** Only the WhatsApp templates the Gymmobius codebase actually dispatches through Interakt. Submit these via Interakt Dashboard → Templates → New Template.

**Out of scope:** Templates for `payment_confirmation`, `member_invite`, `trainer_invite`, `saas_payment_receipt`, and `member_registration_request` are NOT included here — those notification types are configured as **email-only** in [`_shared/notifications.ts → CHANNEL_MAP`](supabase/functions/_shared/notifications.ts#L51) and never call Interakt. See [`EMAIL_TEMPLATES_REFERENCE.md`](EMAIL_TEMPLATES_REFERENCE.md) for what each one renders.

**Mapping to code:** Every template name below matches the default in `notifications.ts → templateName()`. If you submit Interakt with a different name (e.g. your account already has one called `payment_reminder_v2`), set the corresponding `INTERAKT_TEMPLATE_*` env var in Supabase → Edge Functions → secrets so the code uses the matching name.

**Variable positions matter.** The {{1}}, {{2}}, ... order MUST match what `computeBodyValues()` sends. Otherwise the engine silently substitutes the wrong values into the wrong slots.

---

## Submission checklist (read this first)

For every template:

1. **Category:** UTILITY for the 6 transactional ones below. MARKETING only for `ghost_member_recall` (re-engagement). Never AUTHENTICATION.
2. **Language:** English (`en`) for the templates here. Tamil (`ta`) translations tracked separately per `V3_PHASE_1_IMPLEMENTATION_GUIDE.md` Task 9/13.
3. **Variable example values:** Interakt asks you to provide sample values for {{1}}, {{2}}, etc. during submission so Meta can review. Use the "Sample preview" block under each template.
4. **No CTA buttons in v1** — the payment link is embedded as a body variable for simplicity. URL buttons are a follow-up polish (notes at the bottom).
5. **Header:** Plain text only where present. No media headers — they slow approval and require image upload per send.
6. **Footer:** Optional. Use the "— Gymmobius" tagline only on `saas_*` templates (owner-facing). Member-facing templates leave footer empty so the gym's brand isn't undercut.

### Common Meta rejection reasons (avoid)

- ❌ ALL CAPS in body
- ❌ "Click here" without context — must explain *why* (e.g. "to pay")
- ❌ Promotional language in UTILITY templates ("Don't miss this deal!")
- ❌ Variables at the very start of a sentence with no fixed text ("{{1}}, your...") — fine in the middle ("Hi {{1}}, your...")
- ❌ More than one variable in a row without separator text ("{{1}}{{2}}")
- ❌ Body longer than 1024 chars
- ❌ Trailing whitespace or newlines

---

## 1. `payment_reminder_link` — Razorpay mode

**Category:** UTILITY
**When sent:** Daily cron, 3/1/0 days before member's `expiry_date`. Also on manual "Remind" button (owner dashboard) when gym is in Razorpay payment_mode.
**Recipient:** Member
**Code:** [`daily-expiry-reminders/index.ts`](supabase/functions/daily-expiry-reminders/index.ts) + [`send-payment-reminder/index.ts`](supabase/functions/send-payment-reminder/index.ts)

### Variables

| Position | Maps to | Example |
|---|---|---|
| `{{1}}` | Member name | Ravi |
| `{{2}}` | Plan name | Monthly Pro |
| `{{3}}` | Amount with rupee symbol | ₹1,500 |
| `{{4}}` | Payment link (Razorpay short URL) | https://rzp.io/i/abc123 |

### Body (paste verbatim)

```
Hi {{1}}, your {{2}} membership renewal is due. Amount: {{3}}.

Pay securely here: {{4}}

Tap the link to complete your payment in under 60 seconds. See you at the gym!
```

### Footer

*(leave empty)*

### Sample preview

> Hi Ravi, your Monthly Pro membership renewal is due. Amount: ₹1,500.
>
> Pay securely here: https://rzp.io/i/abc123
>
> Tap the link to complete your payment in under 60 seconds. See you at the gym!

---

## 2. `payment_reminder_upi` — UPI mode

**Category:** UTILITY
**When sent:** Same triggers as `payment_reminder_link` but when gym is in UPI payment_mode.
**Recipient:** Member
**Code:** Same files as above (template selected based on `gym.payment_mode`).

### Variables

| Position | Maps to | Example |
|---|---|---|
| `{{1}}` | Member name | Ravi |
| `{{2}}` | Plan name | Monthly Pro |
| `{{3}}` | Amount with rupee symbol | ₹1,500 |
| `{{4}}` | Public payment page URL | https://gymmobius.com/pay/abc123def456 |

### Body

```
Hi {{1}}, your {{2}} membership renewal is due. Amount: {{3}}.

Pay via UPI (GPay / PhonePe / Paytm): {{4}}

The link opens a quick checkout page — tap to pay, or mark "I paid" after sending UPI directly to the gym.
```

### Footer

*(leave empty)*

### Sample preview

> Hi Ravi, your Monthly Pro membership renewal is due. Amount: ₹1,500.
>
> Pay via UPI (GPay / PhonePe / Paytm): https://gymmobius.com/pay/abc123def456
>
> The link opens a quick checkout page — tap to pay, or mark "I paid" after sending UPI directly to the gym.

---

## 3. `member_welcome` — First-payment welcome

**Category:** UTILITY
**When sent:** After a member's FIRST successful payment (status flips from `pending`/`inactive` to `active`).
**Recipient:** Member
**Code:** Fires via the `welcome` notification type after public-checkout `verify-public-payment` succeeds.

### Variables

| Position | Maps to | Example |
|---|---|---|
| `{{1}}` | Member name | Ravi |
| `{{2}}` | Gym name | OwnGains |
| `{{3}}` | Plan name | Monthly Pro |

### Body

```
Welcome to {{2}}, {{1}}! 🎉

Your {{3}} membership is now active. You can access workouts, track your progress, and view payment history anytime in your member portal.

Looking forward to seeing you train with us!
```

### Footer

*(leave empty)*

### Sample preview

> Welcome to OwnGains, Ravi! 🎉
>
> Your Monthly Pro membership is now active. You can access workouts, track your progress, and view payment history anytime in your member portal.
>
> Looking forward to seeing you train with us!

---

## 4. `membership_expiry_reminder` — Pre-expiry alert (no payment context)

**Category:** UTILITY
**When sent:** Reserved for the `expiry_alert` notification type — used when a separate "your membership ends in X days" reminder is fired independently of the payment-link flow.
**Recipient:** Member
**Note:** As of 2026-06-05 the cron uses `payment_reminder_*` for the 3/1/0 day reminders. `membership_expiry_reminder` is staged for future use (e.g. annual members who don't need a per-renewal link).

### Variables

| Position | Maps to | Example |
|---|---|---|
| `{{1}}` | Member name | Ravi |
| `{{2}}` | Gym name | OwnGains |
| `{{3}}` | Days left until expiry | 3 |

### Body

```
Hi {{1}}, your membership at {{2}} ends in {{3}} day(s).

Drop by the gym anytime — we'll help you renew on the spot, or you can reach out for a payment link.
```

### Footer

*(leave empty)*

### Sample preview

> Hi Ravi, your membership at OwnGains ends in 3 day(s).
>
> Drop by the gym anytime — we'll help you renew on the spot, or you can reach out for a payment link.

---

## 5. `ghost_member_recall` — "We miss you" nudge

**Category:** MARKETING ← *the only marketing template in this set; re-engagement, not transactional*
**When sent:** Daily ghost-detection cron, on days 5 / 14 / 30 of consecutive inactivity (configurable via `GHOST_REMINDER_DAYS` env).
**Recipient:** Member (lapsed)
**Code:** [`ghost-detection/index.ts`](supabase/functions/ghost-detection/index.ts)

### Variables

| Position | Maps to | Example |
|---|---|---|
| `{{1}}` | Member name | Ravi |
| `{{2}}` | Gym name | OwnGains |
| `{{3}}` | Days since last check-in | 14 |

### Body

```
Hey {{1}}, we've missed you at {{2}} — it's been {{3}} days since your last check-in.

Your goals are waiting. Drop by this week and we'll help you pick up right where you left off.
```

### Footer

*(leave empty)*

### Sample preview

> Hey Ravi, we've missed you at OwnGains — it's been 14 days since your last check-in.
>
> Your goals are waiting. Drop by this week and we'll help you pick up right where you left off.

**Special note on cadence:** Member receives this at most 3 times per absence streak (days 5, 14, 30). After 30 days the system goes silent — the cron explicitly stops sending so the gym's WhatsApp number doesn't get marked as spam.

---

## 6. `saas_expiry_reminder` — Gym owner's subscription expiring

**Category:** UTILITY
**When sent:** Daily SaaS-side cron, on days 7 / 3 / 1 / 0 before the gym OWNER's subscription expires.
**Recipient:** Gym owner (not gym members)
**Code:** [`daily-expiry-reminders/index.ts`](supabase/functions/daily-expiry-reminders/index.ts) (SaaS branch)

### Variables

| Position | Maps to | Example |
|---|---|---|
| `{{1}}` | Owner name | Sridhar |
| `{{2}}` | Subscription plan | Pro |
| `{{3}}` | "today" or "in N day(s)" | in 3 days |
| `{{4}}` | Billing URL | https://app.gymmobius.com/owner-dashboard/subscription |

### Body

```
Hi {{1}}, your Gymmobius {{2}} subscription expires {{3}}.

Renew here to keep your member management, payment tracking, and automated reminders running without interruption: {{4}}

If you don't renew, you'll lose access to add new members and send reminders. Existing data stays safe.
```

### Footer

```
— Gymmobius
```

### Sample preview

> Hi Sridhar, your Gymmobius Pro subscription expires in 3 days.
>
> Renew here to keep your member management, payment tracking, and automated reminders running without interruption: https://app.gymmobius.com/owner-dashboard/subscription
>
> If you don't renew, you'll lose access to add new members and send reminders. Existing data stays safe.
>
> *— Gymmobius*

---

## 7. `weekly_summary` — Owner weekly digest

**Category:** UTILITY
**When sent:** Sunday 18:00 IST cron, if the owner has enabled WhatsApp summary delivery in Communication settings.
**Recipient:** Gym owner
**Code:** [`weekly-summary/index.ts`](supabase/functions/weekly-summary/index.ts)

**Channel note:** This is the only type in `CHANNEL_MAP` that defaults to BOTH WhatsApp + email. The owner picks the actual channel in Communication settings; the engine respects it via `metadata.preferredChannels`.

**Env var name quirk:** The Supabase secret that overrides this template name is `INTERAKT_TEMPLATE_DAILY_SUMMARY` (kept that way for ops continuity — the feature was renamed from "daily" → "weekly" everywhere in the codebase, but the env-var name stayed put so any legacy deployment pointing at an old approved `daily_summary` Interakt template doesn't silently break). For a fresh submission: just create the template in Interakt as `weekly_summary`, and you don't need to set the env at all — the code default already matches.

### Variables

| Position | Maps to | Example |
|---|---|---|
| `{{1}}` | Owner name | Sridhar |
| `{{2}}` | Pending payments count + total | 5 (₹7,500) |
| `{{3}}` | Members expiring this week | 3 |
| `{{4}}` | Revenue this week | ₹12,000 |

### Body

```
Hi {{1}}, here's your weekly Gymmobius summary:

📋 Pending payments: {{2}}
⏰ Members expiring this week: {{3}}
💰 Revenue this week: {{4}}

Open your dashboard to follow up on pending payments and review expiring members before they lapse.
```

### Footer

```
— Gymmobius
```

### Sample preview

> Hi Sridhar, here's your weekly Gymmobius summary:
>
> 📋 Pending payments: 5 (₹7,500)
> ⏰ Members expiring this week: 3
> 💰 Revenue this week: ₹12,000
>
> Open your dashboard to follow up on pending payments and review expiring members before they lapse.
>
> *— Gymmobius*

---

## Submission order (recommended)

Submit in this order — Meta usually approves the simpler ones faster, and a fast-approved template lets you smoke-test before the harder ones come back:

1. `member_welcome` *(simplest body, fast approval)*
2. `payment_reminder_link`
3. `payment_reminder_upi`
4. `membership_expiry_reminder`
5. `saas_expiry_reminder`
6. `weekly_summary`
7. `ghost_member_recall` *(MARKETING category — different review queue, often slower)*

Approval typically takes 24–48 hours per template. Submit them all in one sitting.

---

## After approval — environment configuration

Set these as Supabase Edge Functions secrets if your Interakt template names differ from the defaults above. If you use the exact names listed, you can skip this entirely (the code falls back to these as defaults).

| Env var | Default | Set when |
|---|---|---|
| `INTERAKT_TEMPLATE_PAYMENT_LINK` | `payment_reminder_link` | You renamed the Razorpay reminder template |
| `INTERAKT_TEMPLATE_PAYMENT_UPI` | `payment_reminder_upi` | You renamed the UPI reminder template |
| `INTERAKT_TEMPLATE_WELCOME` | `member_welcome` | You renamed the welcome template |
| `INTERAKT_TEMPLATE_EXPIRY` | `membership_expiry_reminder` | You renamed the expiry alert |
| `INTERAKT_TEMPLATE_GHOST_REMINDER` | `ghost_member_recall` | You renamed the recall template |
| `INTERAKT_TEMPLATE_SAAS_EXPIRY` | `saas_expiry_reminder` | You renamed the SaaS expiry template |
| `INTERAKT_TEMPLATE_DAILY_SUMMARY` | `weekly_summary` | You renamed the weekly summary template (env var name stayed `_DAILY_` for ops continuity — see template #7 note) |

Set via: `Supabase Dashboard → Edge Functions → Secrets → New secret`. Restart any running edge function (or wait for next cold start) to pick up the change.

---

## Email fallback

Every WhatsApp template above has an automatic **email fallback** baked into the notification engine. If a WhatsApp dispatch fails or is suppressed (Solo Coach plan, quota exhausted, owner-disabled), the engine retries via email. See [`EMAIL_TEMPLATES_REFERENCE.md`](EMAIL_TEMPLATES_REFERENCE.md) for what each fallback email looks like.

So even if a Meta-approved template gets rejected later, members never silently miss critical messages — they get them via email instead.

---

## Smoke-test after approval

1. Approve all templates in Interakt.
2. Open `Owner Dashboard → Communication` page (or `Members → click any member → Remind` if you want to dry-run on a specific member).
3. Trigger one of each:
   - **payment_reminder**: click "Remind" on a member with a pending payment
   - **welcome**: complete a public-checkout signup
   - **ghost_member_recall**: requires a member with no check-in for 5+ days; easiest tested by manually backdating a member's `last_checkin` then triggering the cron URL
   - **saas_expiry_reminder**: manually backdate a subscription's `expires_at` to today + 3, then trigger the SaaS daily cron
4. Check the `notifications` table for each row — `status` should be `sent`, `channel_results.whatsapp` should have a `provider_message_id` from Interakt.
5. Verify the actual WhatsApp message landed on the test phone and the variable substitution is correct.

If a template fires with `status='failed'` and the error mentions "template not found" or "template name not approved", double-check the env var → template name spelling.

---

## Future polish (optional, v1.1+)

### URL buttons on payment reminders

Today the pay link is a plain text variable {{4}}. WhatsApp also supports dynamic URL buttons that render as a tappable "Pay Now" button at the bottom of the message — much higher click-through rate.

To migrate:
1. In Interakt, edit `payment_reminder_link` (or create v2): add a URL button labeled "Pay Now" with dynamic URL pattern like `https://rzp.io/i/{{1}}` where {{1}} = token suffix.
2. Code change: pass the token suffix separately as a button-param in the dispatcher.
3. Drop {{4}} from the body (or keep as a fallback for clients that don't render buttons).

Skipping this for v1 because it requires both code + template changes. Plain link works on every WhatsApp client.

### Quick-reply buttons on ghost recall

`ghost_member_recall` could include two quick-reply buttons: "I'll be there this week" / "Pause my membership" so the member can respond without typing. Captures intent for the gym to follow up with.

Same v1.1 deferral — needs webhook handling on the response side.

### Tamil translations

Per `V3_PHASE_1_IMPLEMENTATION_GUIDE.md` Task 13. Each template above needs a `_ta` variant submitted separately in Interakt. The engine's `templateName()` selects language; we'd add a member-level language preference and route accordingly. Translator-blocked.
