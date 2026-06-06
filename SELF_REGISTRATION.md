# Member Self-Registration — Implementation Record

**Build dates:** 2026-06-04 — 2026-06-05
**Scope:** Public-facing member self-registration request flow with owner-side approval queue. Replaces the "owner manually adds every member" bottleneck for migrating existing gym member rosters.
**Goal:** Honest record of what shipped in MVP, what's intentionally deferred, and what needs to land before launch volume justifies it.

This is an implementation record, not a spec proposal. See `V3_ARCHITECTURE.md` and `LIFECYCLE_AUDIT.md` for the broader system context.

---

## TL;DR

A prospective member fills the form at `/:gym-slug/register` → request lands in `pending_member_registrations` table (cap-isolated, no slot consumed) → owner sees an amber "X pending self-registrations" card on the Members page and clicks Approve → existing `createMember` + invite-email chain runs as if the owner added them manually. QR check-in's "New here?" CTA now routes to the registration form instead of the auth-account-setup `/join` page.

MVP shipped. Spam mitigation, auto-expiry, and branch picker are deferred to v1.1 — all are stability/polish items, not launch blockers.

---

## 1. What shipped (MVP — production-ready)

### DB

| Object | Purpose |
|---|---|
| `pending_member_registrations` table | Queue table, RLS-protected (owners/trainers SELECT, owners UPDATE; INSERT only via service-role edge fn) |
| Partial unique index `(gym_id, phone) WHERE status='pending'` | Prevents accidental double-submit on the same gym |
| Partial unique index `(gym_id, lower(email)) WHERE status='pending'` | Same, case-insensitive on email |
| Partial index `(gym_id, submitted_at desc) WHERE status='pending'` | Dashboard load — bounded by the queue size |

Migration: [`supabase/migrations/20260610_pending_member_registrations.sql`](supabase/migrations/20260610_pending_member_registrations.sql). Applied via MCP on 2026-06-04.

### Edge function

**`submit-member-registration`** ([source](supabase/functions/submit-member-registration/index.ts)) — public (verify_jwt=false, declared in `config.toml`):

- Validates `gymSlug`, name (≥2 chars), 10-digit Indian phone, email shape
- Resolves gym by slug; refuses if `subscriptions.status='expired'` (mirrors createMember's expired-sub block)
- Optional `branchId` validated against the gym's branches
- Dedups against the live `members` table (active rows only) → 409 with friendly "you're already registered" message
- Dedups against the pending queue → returns success idempotently if a matching pending row already exists (handles refresh/network retry)
- Inserts pending row
- Notifies the gym owner via the engine using new type `member_registration_request` (email-only)

### Notification engine integration

- New `NotificationType`: `member_registration_request` ([source](supabase/functions/_shared/notifications.ts#L46))
- `CHANNEL_MAP`: email-only (no WhatsApp template needed — owner-facing)
- New template: `memberRegistrationRequestEmail` in [`emailTemplates.ts`](supabase/functions/_shared/emailTemplates.ts) — renders member details + one-click dashboard link

### Frontend service

[`src/services/memberRegistrationService.js`](src/services/memberRegistrationService.js) — clean four-function surface:

| Function | Caller | Purpose |
|---|---|---|
| `submitMemberRegistration({gymSlug, name, phone, email, branchId?, notes?})` | Public registration form | Calls the edge fn; unwraps non-2xx body so friendly errors reach the UI |
| `fetchPendingRegistrations(gymId)` | Owner MembersPage | Reads via RLS (owners/trainers only) |
| `fetchPendingRegistrationCount(gymId)` | Reserved for future badge | Lightweight count for nav badge |
| `approveRegistration(registrationId, opts)` | Owner approval button | Reuses `createMember` + `assignPlan` + `recordManualPayment` + `sendMemberInvite` chain; idempotent via createMember's dedup |
| `rejectRegistration(registrationId, reason?)` | Owner reject button | Status flip + audit fields |

### Public page

[`src/pages/gym/GymRegisterPage.jsx`](src/pages/gym/GymRegisterPage.jsx) at route `/:slug/register` (also accessible on subdomain + custom-domain mounts via the host-aware `basePath` from GymContext):

- Identity-only fields: name, phone, email, optional notes
- Gym-branded shell (logo + name + theme color)
- Success state ("we've received your request, you'll get an email when approved")
- Friendly error handling for already-member / expired-gym

### Owner approval UI

In [`src/pages/owner/MembersPage.jsx`](src/pages/owner/MembersPage.jsx):

- Amber card above the members list when `pendingRegs.length > 0`
- Per-row: name, phone, email, branch (if multi-branch), notes, submitted timestamp
- Per-row "Send invite email" checkbox (default checked) — owner can skip for phone-only walk-ins
- Approve / Reject buttons with optimistic UI
- "Copy registration link" affordance under the page header (always visible, even when queue is empty, so owner can share via WhatsApp)
- Quota / expired-sub errors during approval surface in the existing `UpgradeRequiredModal` — same path as the regular Add Member flow

### QR routing

[`src/pages/checkin/CheckinPage.jsx`](src/pages/checkin/CheckinPage.jsx) — the "New here?" CTA on the check-in lock screen now routes to `/:slug/register` instead of `/:slug/join`. Resolves the long-standing misleading-UX where a prospect would create an orphan auth.users row with no member match.

### config.toml

[`supabase/config.toml`](supabase/config.toml) declares `verify_jwt = false` for `submit-member-registration` so the next `supabase functions deploy` doesn't reset the setting to the (true) default.

---

## 2. Trust + safety model

The architecture is deliberately conservative for v1 — owner-approval-by-default with no auto-confirm option.

| Concern | Mitigation |
|---|---|
| **Spam fills the queue** | DB partial unique indexes block accidental double-submits. Real spam (different emails/phones) is not yet mitigated — see "Deferred" §3 |
| **Cap exhaustion** | Pending rows live in their own table; do NOT count against the `PLAN_CAPS.members` quota. Only approval consumes a slot via `createMember`'s cap-check |
| **Already-member collision** | Edge fn checks `members` table first (case-insensitive email, exact phone) → returns 409 with "you're already registered, check email or contact gym" — doesn't even queue the row |
| **Soft-deleted member resurrects via self-reg** | `createMember` already revives soft-deleted rows; approval flow inherits this automatically |
| **Member sets bogus renewal date** | Form doesn't expose plan or renewal date. Owner sets both during approval (or assigns later from the drawer) |
| **Payment status manipulation** | Form doesn't claim "already paid". Owner records payment status during approval |
| **Wrong gym (typo'd URL)** | Gym name + logo render prominently on the form. Slug-keyed route makes URL guessing impractical |
| **Expired gym accepting registrations** | Edge fn refuses with "this gym is not currently accepting new registrations" |
| **Cross-gym member registers elsewhere** | Different `gym_id` → no collision. Member can be registered at multiple gyms (rare but supported) |
| **Owner approves but cap reached between submit + approve** | `createMember`'s quota guard fires → `UpgradeRequiredModal` surfaces → pending row stays in queue, doesn't consume a slot |

---

## 3. Deferred to v1.1 (tracked, not blocking launch)

Listed in priority order for the next iteration.

### 3.1 Spam mitigation — IP rate-limit + Cloudflare Turnstile captcha

**Why deferred:** zero observed abuse at MVP volume. First 10 customers are hand-selected; queue spam isn't realistic.

**When to add:** before any public-domain announcement, ads, or Product Hunt launch. The partial unique indexes catch accidental repeats but not a determined adversary fanning out across email aliases.

**Implementation sketch:**
- Cloudflare Turnstile (free, no Google reCAPTCHA dependency) widget on the public form. Token submitted with the form data; edge fn verifies via Turnstile's server-side API.
- IP-based rate-limit at the edge function — Deno KV or a `submit_attempts` table with `(ip_hash, submitted_at)` keyed lookup. 5 requests / IP / hour is a reasonable starting cap.
- Per-phone rate limit (3 submissions / phone / day) as a defense against email-cycling.

Estimated effort: 2-3 hours.

### 3.2 Auto-expire pending registrations cron

**Why deferred:** queue size is small enough today that owners can manually reject stale rows.

**When to add:** when any gym has > 30 pending rows older than 30 days.

**Implementation sketch:**
- pg_cron job (daily, ~03:30 UTC, slot between existing crons): `UPDATE pending_member_registrations SET status='expired' WHERE status='pending' AND submitted_at < now() - interval '30 days'`
- Optional: send the member a "your registration expired, please re-apply" email if you want closure.
- Surface a count of recently-expired rows in the dashboard if owners want to review.

Estimated effort: 30 min.

### 3.3 Branch picker on public registration form

**Why deferred:** branches require a non-trivial public RPC (gym_branches table has RLS restricted to gym staff). Single-branch gyms (most of the user base) don't need it.

**When to add:** when an Enterprise customer with multi-branch setup adopts self-registration. Until then, owner picks branch during approval — slight extra work for them but acceptable.

**Implementation sketch:**
- Add public RPC `get_gym_public_branches(gym_id_or_slug)` — SECURITY DEFINER, returns minimal `(id, name, city)`. No phone/email/internal fields.
- Extend the public registration form with a "Which location do you train at?" dropdown.
- Extend `submit-member-registration` to validate the branch_id matches the gym (already does, just becomes meaningful).

Estimated effort: 1-2 hours.

### 3.4 Auto-approve toggle (per-gym setting)

**Why deferred:** owner-approve was the safe default; no customer has asked for auto-approve yet.

**When to add:** when a gym (typically corporate / walk-in studio) explicitly requests it.

**Implementation sketch:**
- Boolean column `gyms.auto_approve_self_registrations` (default false)
- Toggle on Settings → Subscription card with a warning ("approved members consume your plan slot immediately; cannot be undone without delete")
- `submit-member-registration` edge fn checks this flag — when true, runs the createMember + invite chain server-side instead of inserting a pending row
- Pending-registrations card hidden when toggle is on (no queue to surface)

Estimated effort: 2 hours.

### 3.5 Reject reason capture UI

**Why deferred:** `rejectRegistration` already accepts a reason parameter (saved to `reject_reason` column), but the UI only uses `dialog.confirm()` — no input field for the reason.

**When to add:** if owners ask for it, or when 3.6 (email rejected members) ships.

**Implementation sketch:**
- Replace `dialog.confirm()` with a small inline reason input (1-line text field) above the Reject button when clicked
- Pass to `rejectRegistration(id, reason)` — already supported

Estimated effort: 30 min.

### 3.6 Email rejected members

**Why deferred:** rejection is rare today. Currently the member just doesn't hear back, which is acceptable but not great.

**When to add:** alongside 3.5 (so the captured reason can be included in the email).

**Implementation sketch:**
- New notification type `member_registration_rejected` (email)
- Template: "We weren't able to approve your registration at {gym}. {Optional reason}. Please contact the gym directly if you'd like to discuss."
- Fired from `rejectRegistration` when reason is provided

Estimated effort: 1 hour (template + engine wiring).

### 3.7 Member-facing status check page

**Why deferred:** member doesn't have a way to check "is my registration approved yet?" Currently they just wait for the email.

**When to add:** if support requests pile up ("did you get my registration?"). Low-priority — easy to redirect via the existing dedup ("you're already registered, check your email").

**Implementation sketch:**
- Token-based status URL emailed alongside the submission confirmation (e.g., `/:slug/register/status?token=<jwt>`)
- Shows current state: pending / approved (link to /join) / rejected (reason if any)
- Or: skip the dedicated page; rely on the dedup behavior and contact-gym fallback

Estimated effort: 2-3 hours if you build the page. 0 if you accept the dedup behavior as the answer.

### 3.8 Owner notification batching

**Why deferred:** today every self-registration triggers one `member_registration_request` email. At MVP volume this is fine.

**When to add:** if any gym sees > 5 registrations / day and complains about email volume.

**Implementation sketch:**
- New gym setting: `registration_notification_mode` ('per-event' | 'daily-digest' | 'none')
- Per-event = current behavior
- Daily-digest = cron sends one summary email at 18:00 IST with the day's pending count + a quick-link
- None = silent (owner relies on dashboard badge)

Estimated effort: 2 hours.

---

## 4. Known sharp edges (don't fix unless they bite)

Documented for awareness, not action.

| Edge case | What happens | Why it's OK for now |
|---|---|---|
| Member registers, then owner manually adds them with the same email before approving | The owner-add succeeds (no pending-table collision). The pending row sits orphaned. Owner has to reject it. | Rare — owners don't typically race themselves. Cleanup: 3.2 auto-expire catches it within 30 days. |
| Member registers with email X, then later submits again with email X but different phone | Edge fn finds the existing pending row by email → returns idempotent success. Phone is silently ignored on the second submission. | Member just thinks "OK, request received again, good." If they explicitly want to update, current UX = contact the gym. |
| Owner approves with `sendInvite` unchecked | Member is created. No invite email sent. Member can't log in until owner re-sends from the member drawer (existing flow). | This is the intended UX for phone-only walk-ins. |
| Member registers at gymA, gymA's sub expires, member tries again at gymA | Edge fn refuses with "gym not accepting registrations." Member sees the message. | Mirrors createMember's behavior — expired gym is a hard stop for all member growth. |
| Phone has +91 or formatting on submit | Edge fn strips non-digits + slices last 10. Stored as 10-digit string. | Matches the existing member-add normalization. |
| Two owners on the same gym's dashboard both click Approve on the same registration | First wins via the `status='pending'` guard on the UPDATE. Second sees "this registration was already approved." | Race-condition safe. |
| Member already has an auth.users account at a different gym | Approval still works (createMember just stores the email + phone). After invite, they click the email link → /join → /join's getEmailState detects existing auth → routes to login. | Cross-gym membership supported; member uses their existing password to sign in. |

---

## 5. Files reference

| Layer | File | Purpose |
|---|---|---|
| DB | [supabase/migrations/20260610_pending_member_registrations.sql](supabase/migrations/20260610_pending_member_registrations.sql) | Table + indexes + RLS |
| Edge fn | [supabase/functions/submit-member-registration/index.ts](supabase/functions/submit-member-registration/index.ts) | Public submission endpoint |
| Edge fn shared | [supabase/functions/_shared/notifications.ts](supabase/functions/_shared/notifications.ts) | New `member_registration_request` type + dispatch |
| Edge fn shared | [supabase/functions/_shared/emailTemplates.ts](supabase/functions/_shared/emailTemplates.ts) | `memberRegistrationRequestEmail` template |
| Config | [supabase/config.toml](supabase/config.toml) | `verify_jwt = false` for submit-member-registration |
| Service | [src/services/memberRegistrationService.js](src/services/memberRegistrationService.js) | Submit + fetch + approve + reject |
| Public page | [src/pages/gym/GymRegisterPage.jsx](src/pages/gym/GymRegisterPage.jsx) | The registration form |
| Owner UI | [src/pages/owner/MembersPage.jsx](src/pages/owner/MembersPage.jsx) | Pending queue card + share-link affordance |
| QR routing | [src/pages/checkin/CheckinPage.jsx](src/pages/checkin/CheckinPage.jsx) | "New here?" CTA → /:slug/register |
| Routing | [src/App.jsx](src/App.jsx) | Lazy-loaded route for GymRegisterPage |

---

## 6. Deploy checklist (run before any v1.1 enhancement ships)

1. **Apply migration** — already done via MCP for project `zvftzxntqyiuvxduryww`. For a fresh env, run the migration file.
2. **Redeploy edge functions**: `supabase functions deploy` (config.toml protects per-function verify_jwt). Required for the new `submit-member-registration` to come online + for every function importing `_shared/notifications.ts` to pick up the new type.
3. **Smoke test**:
   - Visit `/<your-test-gym-slug>/register` (or the host-equivalent on subdomain/custom-domain)
   - Submit a fresh email + phone
   - Confirm pending row appears in MembersPage's amber card
   - Click Approve → verify member appears in the list + invite email arrives
   - Submit with the same email again → expect the friendly "you're already registered" message
   - Submit with a new email but on a gym whose subscription is expired → expect "not accepting registrations"
4. **Verify Dashboard settings** — `submit-member-registration` should show JWT verification = off in the Supabase Dashboard.

---

## 7. Open product questions (worth answering before v1.1)

1. **Does rejection need to be reversible?** Currently `rejectRegistration` is one-way (no "un-reject" action). If an owner rejects by mistake, they'd need to ask the member to re-submit. Probably fine for v1.
2. **Should approved rows be purged or kept?** Currently we keep them (status='approved' + approved_member_id link). Useful for audit; takes minimal space. No action needed unless GDPR/DPDP requires deletion.
3. **Should the "copy registration link" generate a QR code in the dashboard?** Some owners might want a printable QR. Not in 3.x yet — could add as a small affordance.
4. **Should we offer a CSV bulk-approve?** If a gym migrates 200 members at once via self-reg, approving one-by-one is tedious. Multi-select + bulk-approve in the dashboard would scale better. Worth ~3 hours when needed.
