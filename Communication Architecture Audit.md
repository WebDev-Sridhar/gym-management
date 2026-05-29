# GymMobius — Communication Architecture Audit

## 1. Executive Summary

GymMobius has a **partially-built** communication backbone with one well-designed entry point ([_shared/notifications.ts](supabase/functions/_shared/notifications.ts)) and **five edge functions that bypass it** — including every payment-confirmation path and the cron-driven member/SaaS expiry reminders. The system's headline policy ("all WhatsApp failures fall back to email") is implemented in code but is unreachable from the flows that need it most.

**The four launch-blocking truths:**

1. **Payment confirmations are largely unsent.** The dashboard checkout, the manual "mark as paid" action, the Razorpay webhook, AND the SaaS subscription verification path do **not** call `sendNotification('payment_confirmation', …)`. Only [verify-public-payment](supabase/functions/verify-public-payment/index.ts) does. A member who pays through the most common flow (owner clicks "Collect" + Razorpay Checkout) receives no receipt.
2. **The WhatsApp → email fallback is bypassed by the highest-volume path.** [daily-expiry-reminders](supabase/functions/daily-expiry-reminders/index.ts) sends Interakt directly and writes only to `payment_reminders` — it never enters `sendNotification`, so a WhatsApp outage drops every reminder for every gym silently. Same for [send-payment-reminder](supabase/functions/send-payment-reminder/index.ts) and the SaaS-side branch of daily-expiry-reminders.
3. **Member and trainer invite emails do not exist.** `trainer_invites` is populated and consumed by [linkInviteOrMember.js](src/services/auth/linkInviteOrMember.js), but no edge function sends the trainer a link. There is no member invite flow at all. Owners must tell members/trainers out-of-band that they were added — there is no in-product onboarding email.
4. **No webhook idempotency / replay protection.** [razorpay-webhook](supabase/functions/razorpay-webhook/index.ts) verifies signatures but does not record the Razorpay event id. The `status='pending'` guard on the UPDATE prevents *double-paying*, but it does not prevent re-running side effects (e.g., re-extending membership if a future handler is added). Combined with no Resend/Interakt dedup keys, a webhook storm or replay attack causes unbounded WhatsApp + email sends.

The system is **not launch-ready** as defined by your own product requirements. The fixes are mostly local refactors, not architecture overhauls.

---

## 2. Communication Architecture Map

```
                            ┌──────────────────────────────────┐
                            │  PROVIDERS                       │
                            │  ─ Resend (email, single key)    │
                            │  ─ Interakt (WhatsApp, single)   │
                            │  ─ Twilio (LEGACY, ghost only)   │
                            └────────────┬─────────────────────┘
                                         │
              ┌──────────────────────────┴────────────────────────────┐
              │                                                       │
              │  CENTRAL ENGINE (only path with fallback)             │
              │  supabase/functions/_shared/notifications.ts          │
              │  sendNotification({ type, gymId, ... })               │
              │                                                       │
              │  Channels per type:                                   │
              │  ─ payment_reminder     → whatsapp → fallback email  │
              │  ─ expiry_alert         → whatsapp → fallback email  │
              │  ─ daily_summary        → whatsapp → fallback email  │
              │  ─ payment_confirmation → email                      │
              │  ─ welcome              → whatsapp → fallback email  │
              │                                                       │
              │  Audit: writes `notifications` table                  │
              └──┬────────────────────────────────────────────┬──────┘
                 │                                            │
   ┌─────────────┴────────────┐               ┌──────────────┴───────────────┐
   │  CALLERS (correct)       │               │  CALLERS (BYPASSING engine)  │
   │                          │               │                              │
   │ daily-summary            │               │ send-payment-reminder        │
   │   (cron 08:00 IST)       │               │   (owner-triggered)          │
   │                          │               │                              │
   │ verify-public-payment    │               │ daily-expiry-reminders       │
   │   (public Razorpay)      │               │   (cron 09:00 IST)           │
   │                          │               │                              │
   │ send-test-notification   │               │ ghost-detection              │
   │   (owner sanity test)    │               │   (Twilio, unscheduled)      │
   │                          │               │                              │
   │                          │               │ verify-payment ← NO email   │
   │                          │               │ verify-subscription-payment │
   │                          │               │ razorpay-webhook            │
   │                          │               │ paymentService.markPaymentPaid │
   └──────────────────────────┘               └──────────────────────────────┘

                    SCHEDULERS (pg_cron, UTC times)
   ┌────────────────────────────────────────────────────────┐
   │  expire-stale-records     hourly      :00              │
   │  daily-expiry-reminders   03:30 UTC = 09:00 IST        │
   │  daily-summary            02:30 UTC = 08:00 IST        │
   │  ghost-detection          NOT SCHEDULED (orphan code)  │
   └────────────────────────────────────────────────────────┘
```

---

## 3. Complete Automation Inventory

| # | Use case | Trigger | Edge function | Provider | Routes via engine? | Fallback? | Audit row | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | Manual payment reminder (owner clicks "Send") | UI → POST | [send-payment-reminder](supabase/functions/send-payment-reminder/index.ts) | Interakt | **No** — direct `sendInteraktTemplate` | **None** | `payment_reminders` + `notifications` (dual-write) | Partial |
| 2 | Member expiry reminder (T-3, T-1, T-0) | pg_cron 03:30 UTC | [daily-expiry-reminders](supabase/functions/daily-expiry-reminders/index.ts) | Interakt | **No** | **None** | `payment_reminders` only — bypasses `notifications` | Broken-by-design |
| 3 | SaaS subscription expiry (T-7, T-3, T-1, T-0) | Same cron as #2 | Same function | Interakt | **No** | **None** | **None** — no row in `payment_reminders` or `notifications` | Broken |
| 4 | Daily owner summary | pg_cron 02:30 UTC | [daily-summary](supabase/functions/daily-summary/index.ts) | Both via engine | **Yes** | **Yes** | `notifications` | Correct |
| 5 | Ghost-member callback | "daily 04:30 UTC" per comment — **NOT in 20260503_cron_schedules.sql** | [ghost-detection](supabase/functions/ghost-detection/index.ts) | **Twilio** (legacy, separate path) | **No** | **None** | None — only `console.log` | Orphan; unsched |
| 6 | Payment confirmation — public checkout | After signature verify | [verify-public-payment](supabase/functions/verify-public-payment/index.ts) | Resend via engine | **Yes** | n/a (email is primary) | `notifications` | Correct |
| 7 | Payment confirmation — owner-triggered Checkout | After signature verify | [verify-payment](supabase/functions/verify-payment/index.ts) | — | **No (missing)** | n/a | **No notification at all** | **MISSING** |
| 8 | Payment confirmation — Razorpay webhook (captures + link.paid) | Razorpay → POST | [razorpay-webhook](supabase/functions/razorpay-webhook/index.ts) | — | **No (missing)** | n/a | **No notification at all** | **MISSING** |
| 9 | Payment confirmation — manual "mark as paid" | UI write → no edge fn | `paymentService.markPaymentPaid` (frontend only) | — | **No** | n/a | None | **MISSING** |
| 10 | Payment confirmation — UPI "I Paid" | UI → POST | [confirm-upi-payment](supabase/functions/confirm-upi-payment/index.ts) | — | **No** | n/a | None (it only flips state to `verification_pending`) | Pending verify, not a confirm |
| 11 | SaaS subscription receipt | After signature verify | [verify-subscription-payment](supabase/functions/verify-subscription-payment/index.ts) | — | **No (missing)** | n/a | None | **MISSING** |
| 12 | SaaS subscription receipt — webhook path | Razorpay → POST | [razorpay-webhook](supabase/functions/razorpay-webhook/index.ts) (subscription handler) | — | **No** | n/a | None | **MISSING** |
| 13 | Member invite email | Owner adds member → DB insert only | — | — | — | — | — | **DOES NOT EXIST** |
| 14 | Trainer invite email | `createTrainerInvite` → DB insert only | — | — | — | — | — | **DOES NOT EXIST** |
| 15 | Auth: confirm signup | Supabase managed | Supabase Auth → SMTP | Supabase default (or configured Resend) | n/a | n/a | `auth.users` | Managed |
| 16 | Auth: password reset | `supabase.auth.resetPasswordForEmail` (3 call-sites) | Supabase Auth | Same | n/a | n/a | `auth.users` | Managed |
| 17 | "Find my gym" lookup | Public POST | [find-my-gym](supabase/functions/find-my-gym/index.ts) | Resend (direct) | **No** | n/a | None | OK but unrate-limited |
| 18 | Test notification (Settings → Test) | Owner-triggered | [send-test-notification](supabase/functions/send-test-notification/index.ts) | Direct Interakt OR direct Resend | **No** (correct — test the raw path) | n/a | `notifications` | Correct |
| 19 | Welcome notification (new member activated) | Defined in `CHANNEL_MAP` as `welcome` type | — | — | n/a | n/a | — | **NEVER FIRED** — no caller |

---

## 4. Launch Blockers (severity-ranked)

### CRITICAL — must fix before launch

**C1. Payment confirmation never sent on 4 of 5 paid flows.** A member who pays the gym anything other than the public-website checkout gets zero confirmation. The most common case — owner clicks "Collect", member taps Razorpay — is silent. This will be the first support ticket on day 1.
- Files: [verify-payment/index.ts:97-103](supabase/functions/verify-payment/index.ts#L97-L103), [razorpay-webhook/index.ts:125-173](supabase/functions/razorpay-webhook/index.ts#L125-L173), [src/services/paymentService.js:122-160](src/services/paymentService.js#L122-L160), [verify-subscription-payment/index.ts:124-143](supabase/functions/verify-subscription-payment/index.ts#L124-L143).
- Fix: each must call `sendNotification({ type: 'payment_confirmation', … })` inside a `try/catch` (same pattern as verify-public-payment). For `markPaymentPaid`, this either becomes a new edge function or fires a `payment_paid` DB trigger that calls a worker.

**C2. WhatsApp → email fallback is unreachable for the two highest-volume flows.** `send-payment-reminder` and the cron-driven `daily-expiry-reminders` call `sendInteraktTemplate` directly. If Interakt is degraded or your account is throttled, every reminder for every gym fails silently — no email, no surfaced error to the owner.
- Files: [send-payment-reminder/index.ts:236-291](supabase/functions/send-payment-reminder/index.ts#L236-L291), [daily-expiry-reminders/index.ts:250-275](supabase/functions/daily-expiry-reminders/index.ts#L250-L275), [daily-expiry-reminders/index.ts:317-340](supabase/functions/daily-expiry-reminders/index.ts#L317-L340).
- Fix: route through `sendNotification`. The engine already handles per-gym `whatsapp_enabled` + fallback; the reminder functions are reinventing what the engine does, minus the fallback.

**C3. Razorpay webhook has no event-id idempotency.** Razorpay retries delivery for ~24 hours on any non-2xx. The current code relies solely on `status='pending'` updates, which prevents *re-paying* but does not prevent any other side effect a future handler adds, and does nothing for legitimately-replayed events when you debug in production. There is also no protection against replay attacks (an attacker who captures one valid webhook body + signature can re-submit indefinitely).
- File: [razorpay-webhook/index.ts:26-121](supabase/functions/razorpay-webhook/index.ts#L26-L121).
- Fix: persist `razorpay_event_id` (header `x-razorpay-event-id` or the `id` inside the payload) into a `webhook_events(event_id PRIMARY KEY, gym_id, received_at)` table; reject if it already exists. Reject `received_at` older than the Razorpay retry window (e.g. > 48h).

**C4. No trainer invite delivery.** `trainer_invites.email` is captured but **never emailed** — the trainer is expected to sign up on their own, with auto-link claiming the invite by email match. Without an invite email, this only works if the owner verbally tells the trainer the gym's URL.
- File: [src/services/membershipService.js:526-561](src/services/membershipService.js#L526-L561).
- Fix: new `send-trainer-invite` edge function that emails the gym's branded portal URL + magic-link or sign-up CTA. Token-bearing link to bind the invite to the email at click time.

**C5. No member invite delivery.** `createMember` writes the row and stops. Members must be told out-of-band how to install the member app / set a password. The first payment reminder is therefore the first thing they hear from your system — which means it routes through Interakt and is now subject to opt-in template restrictions.
- Fix: optional "Send invite" action on member creation. Either WhatsApp template ("Welcome to {gym}") or email with the portal URL. Use the existing `welcome` notification type — it's already defined but has no caller.

**C6. ghost-detection cron job is not scheduled but the function exists.** [20260503_cron_schedules.sql](supabase/migrations/20260503_cron_schedules.sql) schedules only `expire-stale-records`, `daily-expiry-reminders`, `daily-summary`. The ghost-detection edge function header claims "daily 04:30 UTC" but no migration creates the schedule. It is also still on **Twilio**, not Interakt, so even if scheduled it violates your "Interakt is the only WhatsApp provider" policy and bills against an unmanaged account.
- Files: [ghost-detection/index.ts](supabase/functions/ghost-detection/index.ts), [ghost-detection/twilio.ts](supabase/functions/ghost-detection/twilio.ts).
- Decision: either remove (it's listed as a product requirement, so probably not) or rebuild on `sendNotification` and add the cron schedule.

**C7. Cron secret model is fragile.** [daily-summary/index.ts:16-19](supabase/functions/daily-summary/index.ts#L16-L19), [daily-expiry-reminders/index.ts:33-37](supabase/functions/daily-expiry-reminders/index.ts#L33-L37), [expire-stale-records/index.ts:13-16](supabase/functions/expire-stale-records/index.ts#L13-L16) all accept the **service-role key** as the cron bearer token. If logs are leaked, this key grants full DB access. The `call_edge_function` helper pulls it from `vault.decrypted_secrets`, which is the right pattern — but the edge function endpoints are then *also* protected by the same key. A dedicated `CRON_SECRET` (ghost-detection already uses one) is the standard pattern. Mixing service-role into request bodies/headers is a foot-gun.

### HIGH

**H1. `find-my-gym` is an open email-spam vector.** No rate limiting, no captcha, no IP throttle. An attacker can hit it in a loop with arbitrary emails — every matching email sends a real Resend email (your bill), every non-matching email returns 200 silently (no attacker feedback but still your CPU). The comment in [find-my-gym/index.ts:22-23](supabase/functions/find-my-gym/index.ts#L22-L23) admits "if abuse becomes a problem, add a hCaptcha." It will be a problem.
- Fix before launch: per-IP throttle (Redis or `verify_jwt`-adjacent rate limit; Supabase doesn't ship one OOTB). Minimum: hCaptcha on the lookup form.

**H2. `triggered_by='manual'` reminder has 24h dedup in frontend, not backend.** [PaymentsPage.jsx](src/pages/owner/PaymentsPage.jsx) computes `lastReminderForMember` and disables the button, but [send-payment-reminder](supabase/functions/send-payment-reminder/index.ts) accepts any number of repeat calls. An owner with two browser tabs, or one who refreshes after the button enables, can spam. Move the 24h check into the edge function.

**H3. Member expiry dedup is fragile.** [daily-expiry-reminders/index.ts:110-129](supabase/functions/daily-expiry-reminders/index.ts#L110-L129) dedups by looking for an existing payment row + an existing `payment_reminders` row dated today. But if the cron run is split across two invocations (e.g. timeout-retry), or two crons fire (the migration's `cron.unschedule` only catches the named job — adding a new migration that re-schedules at a different time leaves the old one), members get double-pinged. Use a unique constraint: `unique(payment_id, date_trunc('day', sent_at))` on `payment_reminders`.

**H4. No cron job timeout / health monitoring.** `cron_runs` table is written to but nothing reads it. If `daily-summary` silently starts failing every morning, you find out from a customer. Add a Supabase scheduled query or alert that pings on `status != 'success'` for the last run of each job.

**H5. SaaS expiry reminders never write to `payment_reminders` or `notifications`.** The SaaS branch of [daily-expiry-reminders/index.ts:301-341](supabase/functions/daily-expiry-reminders/index.ts#L301-L341) calls Interakt directly with no audit row. Owners who don't receive a SaaS reminder cannot tell whether it was sent. Same problem as C2 plus the audit gap.

**H6. UPI "I Paid" flow has no owner notification.** [confirm-upi-payment/index.ts](supabase/functions/confirm-upi-payment/index.ts) flips status to `verification_pending` and returns. The owner has no automatic alert that a member is waiting. Either a daily-summary delta line (you have the count) or a real-time WhatsApp ping is needed before this UX feels professional.

**H7. Reset-password redirect varies across portals.** [LoginPage.jsx:223-225](src/pages/auth/LoginPage.jsx#L223-L225) hardcodes `/reset-password`. [GymLoginPage.jsx:307-309](src/pages/gym/GymLoginPage.jsx#L307-L309) appends `?gym=<slug>`. [SettingsPage.jsx:327-329](src/pages/owner/SettingsPage.jsx#L327-L329) hardcodes `/auth/reset-password`. These need consistent handling, especially across custom-domain tenants — `window.location.origin` from a custom domain redirects back to that domain, which must be in Supabase Auth's allow-list. If the tenant's custom domain isn't in `additional_redirect_urls`, the link breaks. **Tenant onboarding must include redirect-URL allowlisting.**

### MEDIUM

**M1.** `sendNotification` does not respect any per-recipient suppression list. A member with `unsubscribed=true` (column does not exist) is needed for WhatsApp opt-out compliance. Interakt requires opt-in templates, but you should still track who opted out via STOP keyword.

**M2.** No template versioning. `INTERAKT_TEMPLATE_PAYMENT_LINK` is read fresh from env on every call. If the template name in Interakt's dashboard is renamed, every reminder fails until the env var is updated. Cache the name per-deploy and surface a `notifications.failed` count alert.

**M3.** `daily-summary` writes pending-amount and revenue with `Number(r.amount || 0)` — silently coerces nulls. The pendingCount uses `.count` from a `select('amount', { count: 'exact' })`, which returns both the count AND the rows — fine, but a 50k-pending-payment gym will pay an expensive query daily.

**M4.** No tenant-branded sender. All emails go from `Gymmobius <noreply@gymmobius.com>` ([resend.ts:22](supabase/functions/_shared/resend.ts#L22)). Tenant emails should at least set `reply_to: gym.email` so members reply to the gym, not to a black hole. Currently `sendEmail` accepts `replyTo` but no caller in `notifications.ts` passes it.

**M5.** Daily-summary skips gyms with zero metrics, which is good — but also skips gyms whose owner has no `users` row matching `(gym_id, role='owner')`. Multi-owner gyms (none today) silently send to one owner. Document or fix.

**M6.** `extendMembership` is called from 4 places ([verify-payment](supabase/functions/verify-payment/index.ts), [verify-public-payment](supabase/functions/verify-public-payment/index.ts), [razorpay-webhook](supabase/functions/razorpay-webhook/index.ts), [src/services/paymentService.js](src/services/paymentService.js)). All-good — but if both verify-public-payment AND the webhook fire (they will, by design), `extendMembership` runs twice. Need to confirm it's idempotent based on payment id, not member id.

### LOW

**L1.** `console.error` is the only diagnostic for Interakt failures. There is no structured error metric. Wire a Sentry/Logflare receiver before launch — Supabase logs are 7-day rolling.

**L2.** `normalizeIndianPhone` rejects unknown formats. International gyms (you don't have any today) would break. Fine for India launch.

**L3.** `dailySummaryEmail` uses `new Date().toLocaleDateString('en-IN', …)` server-side. Edge functions run in UTC; `Intl` may not even include the IN locale on Deno's default ICU. Verify before launch.

---

## 5. Reliability Analysis

| Failure mode | Current behavior | Required behavior |
|---|---|---|
| Resend down | Direct callers (`find-my-gym`, `send-test-notification`) throw 500. Engine callers (`daily-summary`, `verify-public-payment`) record `failed` in `channel_results` and return 200 — but **no retry**. | Async retry queue with exponential backoff. Minimum: a `notifications.failed` reaper cron that re-fires after 5/15/60 min. |
| Interakt down | `send-payment-reminder` / `daily-expiry-reminders` fail silently per-member; reminder log records the error. **No fallback to email.** Engine callers fall back. | Route everything through engine. Add per-template circuit breaker so a template-not-approved error doesn't burn through 10k members. |
| Cron fails mid-run | `cron_runs.status = 'failed'`, partial sends recorded. **No resume** — the next day's run skips already-reminded members but does not re-attempt today's failures. | Either resume-on-failure (read last failed cron_run, re-attempt failed rows) or guarantee atomicity per-member. |
| Edge function timeout (default 60s, hard cap ~150s) | `daily-expiry-reminders` is a sequential `for` loop over `members.length × interakt RTT`. ~500 reminders at 300ms = 2.5 min. **Will exceed cron HTTP timeout at scale.** | Chunk + paginate with cursor; or move to a queue with worker. Critical before 100 gyms. |
| Webhook replay | Signature validates, `status='pending'` filter prevents double-paid, but no event-id store. | Persist `razorpay_event_id`, return 200 on duplicate. |
| Payment marked paid client-side | [paymentService.js:122](src/services/paymentService.js#L122) `markPaymentPaid` writes directly via RLS-protected supabase client. No notification fires. | Move to an edge function or DB trigger that fires `payment_confirmation`. |
| Network blip between Razorpay verify + extendMembership | `payments.status='paid'` committed; `extendMembership` may not have run. Member sees payment in history but expiry not updated. | Wrap in a server-side transaction OR make `extendMembership` idempotent + run via post-update trigger. |
| OAuth signup of an existing email | Supabase merges identities. No app-level notification. | OK for now; document. |

---

## 6. Security Analysis

| Risk | Status | Action |
|---|---|---|
| Resend API key in env (single platform key) | OK with verified domain | Confirm SPF/DKIM on `gymmobius.com` + custom domain check |
| Interakt API key in env (single platform key) | OK; `apiKeyOverride` is future-ready | Don't expose to frontend |
| Razorpay per-gym keys encrypted at rest | OK (`encryption_version`, `decryptSecret`) | Audit key rotation procedure |
| Cross-gym leak via reminder | Every edge function filters `eq('gym_id', gymId)` derived from JWT. Verified. | OK |
| `find-my-gym` enumeration | Mitigated by always-200 response; not mitigated for spam | See H1 |
| Webhook replay attack | **Not mitigated** | See C3 |
| Open redirect in `find-my-gym` email | URL constructed from `gym.slug` + `MAIN_DOMAIN`. Slugs are owner-controlled but validated at create-time. | Verify slug regex on create |
| Reset-password redirect to custom domain | Supabase requires explicit allowlist; current code uses `window.location.origin`. **Custom-domain tenants will silently break** unless allowlist updated. | Document in tenant onboarding |
| Template injection in `notifications.ts` body values | `bodyValues` are untrusted (member name, gym name). Interakt processes them but template-level XSS not applicable. **In email templates, `safe()` HTML-escapes but only `< > &`** — quotes are not escaped. Attribute-context injection possible if templates ever interpolate into attrs. | Audit `emailTemplates.ts` — currently safe; lock down `safe()` to escape `"` and `'` too. |
| RLS on `notifications` | Owners can SELECT their gym's rows. Writes are service-role only. | OK |
| RLS on `payment_reminders` | Same model. | OK |
| Service-role key as cron bearer | See C7 | Move to dedicated `CRON_SECRET` |

---

## 7. Tenant Isolation

- **Gym ID derivation**: `requireOwner` always reads `gym_id` from `public.users` keyed by the verified JWT subject. No edge function trusts a client-supplied gym_id.
- **Webhook gym routing**: `notes.gym_id` is unauthenticated until the signature validates against that gym's secret. Attacker who forges `gym_id` fails signature → 401.
- **Public checkout dedup-by-phone is gym-scoped** (`eq('gym_id', gym.id).eq('phone', phone)`).
- **Email lookups for find-my-gym / member auto-link are NOT gym-scoped** (intentional — you don't know the gym yet). The risk is that a returned `gym_id` is the one that "wins" the lookup (alphabetic, etc.). [find-my-gym/index.ts:66-86](supabase/functions/find-my-gym/index.ts#L66-L86) uses `limit(1).maybeSingle()` — first match wins. If an email exists in two gyms (legitimate: trainer at one, member at another), the email surfaces only the first.
- **Cross-gym member detection** in `linkInviteOrMember.js` handles this on the post-auth path. On the find-my-gym path, no such protection. **Send to all matched gyms? Send to none? Currently: arbitrary one.**

---

## 8. Cost / Abuse Risks

| Vector | Worst-case cost | Mitigation status |
|---|---|---|
| Manual reminder spam | Owner can re-trigger; UI throttle; no backend throttle | H2 — fix backend |
| Find-my-gym enumeration | Resend at ~₹0.10/email × millions of requests | H1 — add captcha |
| Daily-summary fanout | One per gym per day; capped naturally | OK |
| Daily-expiry-reminders fanout | One per (member × reminder-day). 10k gyms × 100 members × 3 reminder days × ~10% expiring monthly = 100k/day. Interakt at ~₹0.50/message = ₹50k/day = ₹15L/month. | **Must be plan-gated.** |
| Test notification | Owner-only, no rate limit | LOW — add 1/min throttle |
| WhatsApp opt-out compliance | Interakt requires templates; no STOP keyword handler | M1 — required for WhatsApp compliance |

---

## 9. Feature-Gating Candidates (must be gateable; do not design pricing yet)

| Capability | Why it should be gateable |
|---|---|
| Daily summary frequency | Already a per-gym toggle (`daily_summary_enabled`). Make plan-aware. |
| WhatsApp reminders | Quantity-cap per month is the obvious abuse stop. Plan-dependent cap. |
| Number of automated expiry reminders (3, 1, 0 days) | Cheap plans → 1 reminder; pro → all 3. |
| Custom email sender / branded reply-to | Pro-only. |
| Member invite emails | Free for free tier (it's transactional), but rate-limited. |
| Trainer invite emails | Same. |
| Daily summary email vs WhatsApp | WhatsApp summary is premium. |
| Number of branded WhatsApp templates | Free → 1 generic; pro → multiple per type. |
| Ghost-member callback | Pro-only retention feature. |

---

## 10. Suggested Implementation Order

**Pre-launch — must do in this order:**

1. **Route all 5 bypassing edge functions through `sendNotification`** (C1 + C2). One-day refactor; collapse duplicate logic.
2. **Add `payment_confirmation` calls to verify-payment, verify-subscription-payment, razorpay-webhook (both branches), and markPaymentPaid** (C1).
3. **Add Razorpay event-id idempotency table + check** (C3).
4. **Build `send-trainer-invite` and `send-member-invite` edge functions** (C4, C5). Use `welcome` notification type for member; new template for trainer.
5. **Schedule ghost-detection cron OR delete the function and the requirement** (C6). If keeping, port to Interakt + engine.
6. **Move cron secret off service-role to dedicated `CRON_SECRET` in vault** (C7).
7. **Backend throttle for manual reminders (24h per member)** (H2).
8. **Unique constraint on `payment_reminders(payment_id, date(sent_at))`** (H3).
9. **`find-my-gym` captcha + per-IP throttle** (H1).
10. **Tenant-onboarding step: add custom domain to Supabase Auth redirect allowlist** (H7).

**Defer until 100+ gyms:**
- `notifications.failed` retry reaper.
- Chunked / queue-based reminder fanout.
- Per-template circuit breaker.
- Multi-channel suppression list.
- Cron-run health alerting (Logflare/Sentry).
- Tenant-branded email sender (only `reply_to:` for now).
- WhatsApp STOP-keyword opt-out handling (Interakt webhook).

**Defer indefinitely:**
- Template versioning.
- Multi-owner gym support.
- International phone normalization.
- Per-gym Interakt credentials (the `apiKeyOverride` plumbing is already future-ready).

---

## 11. Risk-Priority Matrix

```
          Likelihood →
        │ Low                 Medium               High
   ─────┼──────────────────────────────────────────────────
   High │ C7 (cron secret)    C3 (replay)          C1 (no confirm)
        │                                          C2 (no fallback)
        │                                          C4/C5 (invites)
   ─────┤
 Impact │
   Med  │ M4 (sender)         H7 (custom domain)   H1 (find-my-gym spam)
        │ H5 (saas audit)     H3 (dedup)           H2 (reminder spam)
        │                     H6 (UPI ping)
   ─────┤
   Low  │ L2 (intl phone)     M1, M2, M3           L1 (logging)
        │
```

---

## 12. Pre-Launch Monitoring & Logging Checklist

- [ ] **Sentry / Logflare** ingesting all edge function errors. Supabase logs are 7-day rolling.
- [ ] **Alert on `cron_runs.status != 'success'`** for the last 24h window of each job.
- [ ] **Alert on `notifications.status = 'failed'`** delta exceeding (e.g.) 5% of daily volume.
- [ ] **Alert on Resend bounce rate** > 2%.
- [ ] **Alert on Interakt template-rejected rate** > 1% (signals template approval expired).
- [ ] **Dashboard tile per gym**: last 24h sent / failed counts. Owners need this to trust the system.
- [ ] **Razorpay webhook delivery dashboard** monitored — Razorpay shows replay attempts.
- [ ] **Daily reconciliation**: `count(payments.status='paid' WHERE paid_at::date = today) == count(notifications.type='payment_confirmation' WHERE sent_at::date = today AND status IN ('sent','partial'))`. Drift signals C1 regression.

---

## Bottom Line

The engine is sound; the wiring isn't. Five edge functions need to be re-pointed through `sendNotification`, three flows need a confirmation call added, and two flows (member invite, trainer invite) need to be built. None of that requires architectural change — the contract `sendNotification` exposes is already correct.

Until those gaps are closed, the headline product promise ("WhatsApp with email fallback") is true only for daily-summary, the public checkout receipt, and test sends. Every other path either bypasses fallback or sends nothing at all.
