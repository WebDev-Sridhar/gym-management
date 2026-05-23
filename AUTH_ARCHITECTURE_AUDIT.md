# Authentication Architecture Audit — Gymmobius

**Status:** Pre-refactor analysis. No code changes proposed in this document.
**Scope:** Full system (SaaS owner dashboard, trainer dashboard, member app, public gym sites).
**Date:** 2026-05-22
**Author:** Architecture review prior to SaaS-vs-Gym auth separation.

> **Purpose of this document.** Map the current authentication architecture as it actually exists in the code today, identify the brittle parts, and define a safe migration sequence. Read top-to-bottom before starting any auth refactor. Anything claimed here is grounded in a specific file + line — if a claim no longer matches reality, the code drifted and this doc needs updating, not ignoring.

---

## Table of Contents

1. [Current Auth Architecture Overview](#1-current-auth-architecture-overview)
2. [Auth Flow Mapping](#2-auth-flow-mapping)
3. [Redirect Audit](#3-redirect-audit)
4. [Session Architecture](#4-session-architecture)
5. [Role System](#5-role-system)
6. [Route Structure](#6-route-structure)
7. [Auth Guards](#7-auth-guards)
8. [Password Reset + Magic Link](#8-password-reset--magic-link)
9. [Google OAuth](#9-google-oauth)
10. [Gym Website Auth](#10-gym-website-auth)
11. [Domain + Subdomain Auth](#11-domain--subdomain-auth)
12. [Architecture Classification](#12-architecture-classification)
13. [Technical Debt — Ranked](#13-technical-debt--ranked)
14. [Recommended Separation Strategy](#14-recommended-separation-strategy-advisory-only)
15. [Refactor Risk Assessment](#15-refactor-risk-assessment)
16. [Safe Migration Strategy](#16-safe-migration-strategy)
17. [Summary — Fix Before Refactoring](#17-summary--fix-before-refactoring)

---

## 1. Current Auth Architecture Overview

You run **one Supabase Auth instance** with **one set of `auth.users` rows** shared across the entire product (SaaS owner dashboard, trainer dashboard, member app, public gym sites). Role discrimination is purely application-layer, via `public.users.role ∈ {owner, trainer, member}` joined to `public.gyms` for tenant scope.

### Three frontend "apps", one auth substrate

| App | Mounted at | Auth layout | Login surface |
|---|---|---|---|
| SaaS marketing + owner dashboard | `gymmobius.app` | `LoginPage`, `SignupPage` (App.jsx:151-156) | Same form for everyone |
| Tenant gym public website | `:slug.gymmobius.app`, custom domains, OR `/<slug>` on main host | `GymLoginPage`, `GymJoinPage` (App.jsx:95-96) | Branded per gym |
| Member / Trainer dashboards | `/member-app`, `/trainer-dashboard` | No login of their own — entered via either SaaS login or gym login | — |

Two Supabase clients (`src/services/supabaseClient.js`):

- `supabase` — auth client (Navigator Lock, persistSession)
- `supabaseData` — data client wired through a manual `_accessToken` cache (no Navigator Lock, no `getSession()` per request — was created to fix dashboard query hangs)

A third `supabaseAnon` (no session) is used by public-checkout services.

### Tenant routing splits at the top of `<App>` via `HOST_KIND`

`App.jsx:53-55` computes `HOST_KIND` from `window.location.hostname` exactly once at app boot. If it's `subdomain`/`custom`, only `TenantRoutes` (gym public pages) renders. If `main`, the full Routes tree mounts — including `/login`, `/owner-dashboard`, `/:gymSlug`, etc.

→ **Key implication:** an owner cannot reach the dashboard from `iron-paradise.gymmobius.app` — `/owner-dashboard` doesn't exist in `TenantRoutes`. They must use the bare `gymmobius.app` host.

### Classification (see Section 12 for detail)

This is a **hybrid auth** system. One auth, two login surfaces, three role-shaped dashboards, branching redirect logic across all of them.

---

## 2. Auth Flow Mapping

### 2.1 Owner — Signup → Onboarding → Dashboard

```
/signup
  └─ signUpWithEmail(email, password)
      ├─ Supabase sends confirmation mail with link →
      │     {origin}/auth/callback   (no ?gym tag)
      └─ Step screen "check your email"

[email click]
  → /auth/callback
      ├─ getSession() — onAuthStateChange fallback if missing
      ├─ refreshProfile()
      ├─ fetchUserProfile(user.id) → null    (no row yet)
      ├─ findMemberByEmail(email) → null
      ├─ findTrainerInviteByEmail(email) → null
      ├─ no gymSlug query param
      └─ navigate('/create-gym')

/create-gym  (CreateGymPage)
  ├─ Local gate:  !isAuthenticated → /login
  ├─ Local gate:  profile.onboarding_step === 'subscribed' → /owner-dashboard
  ├─ Local gate:  profile.onboarding_step === 'gym_created' | 'setup_done' → /billing
  ├─ submit:
  │    createGym(...) → createUserProfile({role:'owner', gymId})
  │    updateGymOnboardingStep(gymId, 'setup_done')
  │    refreshProfile()
  └─ navigate('/billing')

/billing  (BillingPage)
  ├─ createSubscriptionOrder → Razorpay Checkout modal
  ├─ verifySubscriptionPayment (via webhook AND in-page verify)
  ├─ refreshProfile()
  └─ navigate('/owner-dashboard')

/owner-dashboard
  └─ ProtectedRoute(allowedRoles=['owner']) → DashboardLayout → <Outlet>
```

**Critical races/gates this flow uses:**

- `setAccessToken` seeding is done at `GymLoginPage:112` but NOT at SaaS `LoginPage` — SaaS login relies on `await refreshProfile()` to pull the new session, which works because `LoginPage` doesn't immediately call `supabaseData` queries.
- `onboarding_step` is **never** stored on `public.users` — it's read from the JOINed gyms row in `fetchUserProfile()` and flattened: `userService.js:14-20`. The actual column lives on `gyms.onboarding_step`.

### 2.2 Owner — Login

```
/login
  └─ PublicRoute → if authenticated, redirect to ROLE_HOME[role]
  └─ signInWithEmail → refreshProfile → navigate('/owner-dashboard')
                                                         │
                                                         ▼
                            ProtectedRoute then re-routes by onboarding_step
                            (owner with !subscribed → /billing or /create-gym)
```

**Notice:** `LoginPage:64` hard-codes `navigate('/owner-dashboard')` *even for non-owner accounts*. The ProtectedRoute on `/owner-dashboard` then catches role mismatch and bounces to `/trainer-dashboard` or `/member-app`. The user sees one redirect flash they never asked for. The SaaS `LoginPage` is implicitly an owner-only door but has no inline messaging that members/trainers should go to their gym's login.

### 2.3 Owner — Google OAuth

```
/login → signInWithGoogle()
  → Google → {origin}/auth/callback
  → routeUser():  same logic as confirm-email
       ├─ profile?  → role-routed (owner → step-aware redirect)
       └─ no profile + no member/trainer-invite + no gym tag → /create-gym
```

The owner-signup Google flow and the member-signup Google flow are **literally the same callback function** (`routeUser`). The branching is entirely on which member/trainer rows exist for the email — there is no notion of "user said they want to sign up as an owner."

### 2.4 Owner — Password Reset

```
/login → forgot step → supabase.auth.resetPasswordForEmail
  redirectTo: {origin}/reset-password    ← hard-coded in LoginPage:94

[email click]
  → /reset-password   (NO PublicRoute / NO ProtectedRoute)
     ├─ supabase.auth.getSession()  — recovery session
     ├─ updateUser({ password })
     ├─ supabase.auth.signOut()
     └─ navigate('/login')                ← hard-coded SaaS login
```

`GymLoginPage:235` *also* sends reset emails with `redirectTo: {origin}/reset-password`. Same target. So a member who triggers "Forgot password" from `iron-paradise.gymmobius.app/login` clicks an email link, lands on `{origin}/reset-password` (SaaS host), sets new password, then `ResetPasswordPage:60` bounces them to `/login` (SaaS owner login form, not their gym's). **Already broken UX today.**

### 2.5 Trainer — Login

There is no dedicated trainer login page. Two paths in:

- **Bootstrap via invite + signup at SaaS `/signup`**: owner adds a `trainer_invites` row → trainer goes to `/signup`, confirms email, lands on `/auth/callback`, `findTrainerInviteByEmail` matches, `createUserProfile({role:'trainer'})` + `claimTrainerInvite` + `createTrainerRecord`, navigate `/trainer-dashboard`.
- **Bootstrap via `GymLoginPage`**: same lookup, runs in `handleLogin` (`GymLoginPage.jsx:151-176`).

Two duplicates of the same invite-claim logic — `AuthCallbackPage:147-163` and `GymLoginPage:151-176`.

### 2.6 Member — Login (Gym Portal)

```
/{slug}/login  (or  {slug}.gymmobius.app/login  in TenantRoutes)
  └─ signInWithEmail
     ├─ setAccessToken(session.access_token) — seeded MANUALLY
     ├─ fetchUserProfile → null?
     │     ├─ findMemberByEmail → match? createUserProfile + linkMemberToAuthUser
     │     └─ findTrainerInviteByEmail → match? createUserProfile + claim
     ├─ Cross-gym guard: member exists but for OTHER gym → signOut + error
     ├─ Neutered profile (role=null) → signOut + "not a member" message
     ├─ refreshProfile()
     └─ navigate('/member-app')  or  ?return=… if member
```

### 2.7 Member — Signup (Gym Portal)

```
/{slug}/join
  └─ signUpWithEmail(email, pwd, {
        emailRedirectTo: `${origin}/auth/callback?gym=${slug}&return=...`,
        metadata: { phone }
     })
  → confirmation email
  → /auth/callback?gym=iron-paradise
     ├─ findMemberByEmail → match same gym? link as member
     ├─ findMemberByEmail → match DIFFERENT gym? "wrong gym portal" screen
     ├─ findTrainerInviteByEmail → claim
     ├─ findMemberByPhone fallback (from user_metadata.phone)
     ├─ no match + ?gym present → "you're verified but not a member" screen
     └─ no match + no ?gym       → /create-gym  (owner onboarding!)
```

That last branch — no member match + no `?gym` tag → routed to owner onboarding — is the legacy "fallback for stranded users" branch (`AuthCallbackPage.jsx:233-240`). It also catches owners whose gym was deleted. That's intentional, but conflates "owner-after-cascade-delete" with "stranger from random Google signup."

---

## 3. Redirect Audit

### 3.1 All redirect-issuing sites

| Site | File / Line | Targets |
|---|---|---|
| `ProtectedRoute` declarative gate | ProtectedRoute.jsx:22-51 | `/login`, `/create-gym`, `/billing`, `/owner-dashboard`, `/trainer-dashboard`, `/member-app` |
| `PublicRoute` declarative gate | PublicRoute.jsx:21-23 | `ROLE_HOME[role]` |
| `AuthContext.loadProfile` neuter branch (imperative) | AuthContext.jsx:92-172 | `/${slug}/login` or `/login` via `window.location.replace` |
| SaaS `LoginPage.handleLogin` | LoginPage.jsx:64 | `/owner-dashboard` (always, even for non-owners) |
| `GymLoginPage.handleLogin` | GymLoginPage.jsx:212 | `/member-app`, `/trainer-dashboard`, `/owner-dashboard`, or `returnTo` |
| `AuthCallbackPage.routeUser` | AuthCallbackPage.jsx:141, 161, 204, 239, 247-260 | `/member-app`, `/trainer-dashboard`, `/owner-dashboard`, `/billing`, `/create-gym`, `?return=` |
| `CreateGymPage` declarative early returns | CreateGymPage.jsx:28-37 | `/login`, `/owner-dashboard`, `/billing` |
| `BillingPage` declarative early returns + post-pay | BillingPage.jsx:84-91, 123 | `/login`, `/create-gym`, `/owner-dashboard` |
| `OnboardingPage` declarative early returns | OnboardingPage.jsx:29-47 | `/login`, `/create-gym`, `/owner-dashboard`, `/trainer-dashboard`, `/member-app` |
| `ResetPasswordPage` post-update | ResetPasswordPage.jsx:60 | `/login` (SaaS) — wrong for gym-side resets |
| `MemberProfilePage.handleLogout` | MemberProfilePage.jsx:39-55 | `/${slug}/login` via `window.location.replace` |
| `TrainerSettingsPage.handleLogout` | TrainerSettingsPage.jsx:7-23 | `/${slug}/login` via `window.location.replace` |
| `GymContext` redirect-after-rename | GymContext.jsx:83-97 | rewrites URL when slug/subdomain changed |

### 3.2 Redirect ownership diagram

```
                          USER ACTION
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Supabase Auth event           │
              │ (signIn / signOut / refresh)  │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌─────────────────────────────────────┐
              │ AuthContext.loadProfile             │
              │  ├─ Detects "neutered" profile      │
              │  │   → sync localStorage purge      │
              │  │   → window.location.replace      │
              │  │      (slug-aware, escapes React) │
              │  └─ Else just sets state            │
              └───────────────┬─────────────────────┘
                              │ React re-render
                              ▼
       ┌───────────────────────────────────────────────┐
       │ ProtectedRoute / PublicRoute                  │
       │  Declarative <Navigate> based on role + step  │
       └─────────────┬─────────────────────────────────┘
                     │
                     ▼
       ┌──────────────────────────────┐
       │ Page-level imperative        │
       │ navigate() inside handlers   │
       │  (Login, Callback, Onboard…) │
       └──────────────────────────────┘
```

**Three layers** that can redirect — context-imperative, route-declarative, page-handler-imperative — *and they don't share a vocabulary or precedence rule.* Order of operations is governed by React's render cycle plus whichever effect or handler fires first. This is the core source of fragility.

### 3.3 Race conditions and conflicts you currently have

1. **`LoginPage` → `/owner-dashboard` → ProtectedRoute role bounce.** Non-owners always see a flash of `/owner-dashboard` loading state before being kicked to `/member-app` etc.
2. **AuthCallback `getSession()` fallback path** (AuthCallbackPage.jsx:40-54) subscribes to `onAuthStateChange` with a 10 s timeout. If Supabase recovers session via URL hash AFTER the listener mounts, race resolves correctly. If the session was already set by `AuthContext` before this page mounts, listener never fires — but the initial `getSession()` returned non-null so we skip the listener anyway. Brittle but works in practice.
3. **AuthContext "neuter" detection** at AuthContext.jsx:92 is the only path that uses raw `window.location.replace` to escape React's redirect race. It exists because `ProtectedRoute`'s `<Navigate>` was firing before tokens were purged from `localStorage`, causing infinite reload loops on `/login`. The fix is a workaround, not a design — every other redirect path can fall victim to similar timing if it ever needs to navigate AFTER a session change.
4. **GymLoginPage explicit `setAccessToken` seed** (line 112) exists because `AuthContext.onAuthStateChange` runs asynchronously and `supabaseData` queries would block on RLS otherwise. **SaaS `LoginPage` has no such seed** — it works only because the page immediately navigates without issuing data queries.
5. **`refreshProfile()` called explicitly in 5 places** (LoginPage, GymLoginPage, CreateGymPage, BillingPage, AuthCallback) to close the same race. Forgetting any one of them creates "you have to refresh the page to see your dashboard" bugs.
6. **`ResetPasswordPage` lacks any auth guard**. Anyone with a valid recovery session lands here — including a member who reset from a gym portal — and gets bounced to `/login` (SaaS), not `/{slug}/login`.

### 3.4 Why current redirects became complicated

- **One callback** (`/auth/callback`) handles owner email-confirm, member email-confirm, trainer email-confirm, and Google OAuth for all three roles. Branching needs `?gym`, `?return`, `member` row lookup, `trainer_invites` lookup, AND `members.phone` fallback to disambiguate.
- **Single AuthContext + ProtectedRoute** for all three apps means redirect rules for owner-specific onboarding (`step === 'gym_created' → /billing`) live in the same component that gates member access.
- The **"neutered users row"** pattern (deleting members keeps the auth row but nulls role/gym_id) forced a defensive redirect inside AuthContext that bypasses React routing entirely.

---

## 4. Session Architecture

### 4.1 The dual-client model

```
                            ┌────────────────────────┐
                            │  Supabase Auth API     │
                            └──────────┬─────────────┘
                                       │
                      ┌────────────────┼──────────────────┐
                      │                │                  │
              supabase (auth)   supabaseData (data)   supabaseAnon (public)
              ─────────────     ──────────────────    ──────────────────
              · persistSession  · accessToken option  · no session
              · NavigatorLock   · reads _accessToken   · no token refresh
              · Used for:       · cache (manual seed)  · Used for:
                  - signIn      · Used for:              - createPublicOrder
                  - signOut         - ALL .from()        - verifyPublicPayment
                  - getSession      - ALL .functions     - paymentLanding
                  - onAuthState
                    Change        · NO Navigator Lock
                                    → faster dashboards
```

`AuthContext.useEffect` initializer subscribes to `supabase.auth.onAuthStateChange` and calls `setAccessToken(session.access_token)` on every event (AuthContext.jsx:33, 57). The data client picks it up via `accessToken: async () => _accessToken || ''` (supabaseClient.js:37).

### 4.2 Quirks of this design

- The `accessToken` option returns `''` (empty string), not `null`, when no session exists. supabase-js's `fetchWithAuth` does `(await getAccessToken()) ?? supabaseKey` — empty string isn't nullish, so it sends `Authorization: Bearer ` (empty) instead of falling back to the anon key. This causes `UNAUTHORIZED_NO_AUTH_HEADER` errors at the gateway for any edge function called when session is missing. Already hit once with `create-public-order`. Latent.
- `supabaseData.functions.invoke()` uses the customFetch chain that ultimately respects the token — but the `functions` getter (SupabaseClient.ts:364) re-creates a `FunctionsClient` on every access without passing the `accessToken` callback explicitly. Auth flows through `customFetch: this.fetch`, but in some supabase-js versions this was inconsistent. Worth pinning version expectations.

### 4.3 Session domain reach

| Where the session token actually lives | Notes |
|---|---|
| `localStorage` keys with `sb-` prefix | Per-origin. Tokens written under `gymmobius.app` are NOT accessible from `iron-paradise.gymmobius.app`. |
| `gym:lastSlug` localStorage key | Set on every successful profile load to remember which gym to redirect *deleted* members back to. |
| Module-level `_accessToken` in supabaseClient.js | In-memory only, lost on full reload. Re-seeded from `getSession()` via AuthContext. |

**Consequence:** Logging in on `gymmobius.app/iron-paradise/login` and then navigating to `iron-paradise.gymmobius.app` is **a new origin → not signed in**. The user has to log in *again* on the subdomain. There is no cross-host session sharing, and your current architecture has no plan to add one.

### 4.4 Role / gym / branch persistence

| Value | Source of truth | Frontend cache |
|---|---|---|
| `role` | `public.users.role` (text, no FK enum) | `AuthContext.profile.role` |
| `gym_id` | `public.users.gym_id` | `AuthContext.profile.gym_id` |
| `gym_slug`, `gym_name`, `onboarding_step` | `public.gyms` joined via `fetchUserProfile` | flattened onto `profile` |
| `branch_id` | `public.users.branch_id` (trainer only) | `AuthContext.branchId` |
| owner's "selected branch" in dashboard | `BranchContext` localStorage `branch:selected` | only loaded inside `DashboardLayout` |

Trainers and members ride on `users.branch_id` and `members.branch_id` respectively. Owners have no branch — they switch context via `BranchContext` (separate from auth context, only mounted in `DashboardLayout`).

### 4.5 Shared session assumptions to verify

- Every page assumes `useAuth().profile.role` is one of `owner | trainer | member | null`. There is no enum constraint at the DB layer (`20260519_sprint1_security_lockdown.sql` doesn't add one). If RLS ever produces a row with `role = 'admin'` or `'staff'`, the entire role-routing logic ignores it (`!allowedRoles.includes(role)` → fall through).
- "Neutered" profiles (`role = null` on a real user row) are handled in exactly ONE place (`AuthContext`). Page-level guards (`ProtectedRoute.role mismatch`, `LoginPage`, etc.) don't recognize them — they'd render a blank or crash.

---

## 5. Role System

### 5.1 Role resolution points

| Layer | What it does | File |
|---|---|---|
| Frontend `AuthContext` | Flattens `users.role` onto `profile.role`; derives `gymId`, `branchId`, `isAuthenticated` | AuthContext.jsx:244-263 |
| Frontend `ProtectedRoute` | `allowedRoles.includes(role)` else redirect to other dashboard | ProtectedRoute.jsx:44-51 |
| Edge functions | `requireOwner(req)` checks `users.role === 'owner'` server-side | `_shared/auth.ts:21-41` |
| Postgres RLS | Policies on every operational table check `gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'owner')` etc. | scattered across migrations |
| Public site context | `useGym()` resolves gym from URL/host — independent of auth role | GymContext.jsx |

### 5.2 Where role is *implicitly* trusted

- **`createUserProfile`** in `userService.js:71-101` takes `role` as a plain string param. Called from `AuthCallback`, `GymLoginPage`, and `CreateGymPage`. No validation that the caller has the right to assign that role to themselves. **Today's mitigation:** the auto-detection logic only sets `role: 'member'` when a member row matches, etc. — but if an attacker hits `createUserProfile` directly with a known auth uid via console, they could insert any role on `public.users`. RLS policies on `public.users` need to enforce that role cannot be self-set to `owner` or `trainer` without an invite — verify in the security_lockdown migration.

### 5.3 Duplicated role-resolution logic

`AuthCallbackPage:65-260` and `GymLoginPage:100-225` implement **the same** decision tree:

1. fetchUserProfile → exists? route by role
2. exists? no → findMemberByEmail → claim
3. no → findTrainerInviteByEmail → claim
4. no → fallback (notMember screen / `/create-gym`)

These are not extracted to a shared service. Any change to invite-claim semantics (e.g., adding branch_id linking) must be made in **both** files — and the auth callback also has a phone-fallback path that gym-login lacks.

---

## 6. Route Structure

### 6.1 Full route map (main host)

```
PUBLIC (no auth)
├── /                          LandingPage
├── /checkin                   CheckinPage
├── /pay/:token                PayLandingPage
├── /features  /pricing  /demo  /changelog
├── /about  /blog  /careers  /contact
├── /privacy  /terms  /security  /refund-policy

AUTH-CONTEXT
├── /login                     LoginPage         (PublicRoute)
├── /signup                    SignupPage        (PublicRoute)
├── /reset-password            ResetPasswordPage (NO GUARD)
├── /auth/callback             AuthCallbackPage
├── /create-gym                CreateGymPage     (inline gates)
├── /onboarding                OnboardingPage    (inline gates)
├── /billing                   BillingPage       (inline gates)

OWNER (ProtectedRoute roles=['owner'])
└── /owner-dashboard/*         DashboardLayout
    ├── (index)                OwnerDashboard
    ├── home
    ├── plans, members, payments, trainers, analytics
    ├── checkin, settings, website, payment-settings
    ├── communication, messages, programs
    ├── subscription, help, branches

TRAINER (ProtectedRoute roles=['trainer'])
└── /trainer-dashboard/*       TrainerLayout   (internal routing)

MEMBER (ProtectedRoute roles=['member'])
└── /member-app/*              MemberLayout    (internal routing)

GYM PUBLIC (no auth required for read pages)
└── /:gymSlug/*                GymLayout → GymProvider
    ├── (index) about pricing trainers contact
    ├── login                   GymLoginPage   ← scoped auth
    ├── join                    GymJoinPage    ← scoped signup
    ├── privacy terms refund membership waiver
```

### 6.2 Tenant-host (subdomain or custom domain)

```
TenantRoutes  (App.jsx:111-119)
└── /  GymLayout
    └── (same gymChildRoutes — login, join, about, etc.)
```

**No `/owner-dashboard`, `/member-app`, `/trainer-dashboard` exist here.** Members who try to deep-link to their app from `iron-paradise.gymmobius.app/member-app` get a route not found.

### 6.3 Route-structure problems

- **Owner dashboard, member app, trainer dashboard live next to SaaS marketing routes** at the same domain. Bookmark for `gymmobius.app/owner-dashboard` works only because the SaaS host serves the SPA fallback.
- **Member app + trainer dashboard have no tenant context in their URL.** `/member-app` knows nothing about which gym the user belongs to. It relies entirely on `useAuth().gymId`. If a user has rows in two gyms (rare today, but possible if `findMemberByEmail` picked the wrong row — your hardened lookup logs a warning but still picks one), they're silently routed to whichever was returned first.
- **Reset password is global.** The recovery link points to SaaS host. Member portals never have their own reset surface.
- **Reserved-subdomain handling in `host.js`** is the gatekeeper preventing tenant routes from clobbering `www`/`admin`/etc. — if you add new top-level paths (e.g. `/status`), you need to add the corresponding subdomain to `RESERVED_SUBDOMAINS`. Easy to forget.

---

## 7. Auth Guards

### 7.1 Guard inventory

| Guard | Layer | What it gates | Source of truth |
|---|---|---|---|
| `ProtectedRoute` | Route-declarative | role + onboarding step | `useAuth()` |
| `PublicRoute` | Route-declarative | already authed → redirect to role home | `useAuth()` |
| `EmailRequiredGuard` | Layout-wrapper inside `DashboardLayout` | legacy phone-only owners | `user.email && user.phone` |
| Inline gates in `/create-gym` / `/billing` / `/onboarding` | Page-imperative | onboarding step | duplicates `ProtectedRoute` logic |
| `AuthContext` "neuter" branch | Context-imperative | deleted member trying to re-login | `profile.role === null` |
| RLS at DB | Postgres | row-level access | `auth.uid()` + `users.role` |
| Edge function `requireOwner` | Server | API access | bearer token verified server-side |
| `canAccess(featureKey, planName)` | Component-render | feature gating by SaaS plan | `featureGates.js` |

### 7.2 Guard-related issues

- **Onboarding logic appears in 4 places:** ProtectedRoute, CreateGymPage, BillingPage, OnboardingPage. They all express the rule "if subscribed go to dashboard / if step ≥ gym_created go to billing / else go to create-gym" but with subtle variations. CreateGymPage:33-37 redirects to `/billing` for both `setup_done` and `gym_created`. OnboardingPage:38-40 only treats `subscribed` as terminal. AuthCallback:244-253 has a third spelling. All three could drift.
- **`PublicRoute` only protects `/login` and `/signup`.** `/reset-password`, `/auth/callback`, `/create-gym`, `/billing`, `/onboarding` are unguarded at the route level — they each implement their own checks (or, like `/reset-password`, none at all).
- **`ProtectedRoute` waits on `initialized && !loading`** then makes decisions. The loading spinner shown during this gap is fine for hard refreshes but causes a visible flicker when navigating *between* pages after a route change — every guarded route re-mounts the spinner if `loading` flips.
- **No subscription-expired guard.** ProtectedRoute comments say "expired → stay in dashboard; upgrade banner handled in-app" but the dashboard pages don't all have an upgrade banner. A subscription-expired owner can still write data — gated only by `hasActiveSubscription` checks in individual pages.
- **No feature-flag guard at route level.** `/owner-dashboard/branches` is registered for everyone; the BranchesPage itself or `Sidebar.jsx` is responsible for showing/hiding it based on plan. An Enterprise downgrade leaves dashboards still reachable.

---

## 8. Password Reset + Magic Link

- **Magic link** (`sendMagicLink`) is wired in `authService.js` but **never called** from any UI. Dead code awaiting removal or activation.
- **Phone OTP** is explicitly deprecated (`authService.js:110-131`) but exports kept "so in-flight references don't crash before the next release ships."
- **Reset URL is hard-coded to `${origin}/reset-password`** in both SaaS LoginPage and GymLoginPage. There's no way to send a gym-portal reset where the post-reset destination is the gym's URL. → A member who resets from `iron-paradise.gymmobius.app` ends up on the SaaS host with no gym context, sees `/login` (owner form), gets confused.
- **No callback for "successful reset"**. After `updateUser({ password })`, `ResetPasswordPage` calls `signOut()` and navigates to `/login`. Members lose their session and have to re-authenticate on the wrong portal.

---

## 9. Google OAuth

- Single entry: `signInWithGoogle()` in `authService.js`. Used in both SaaS `LoginPage` and `SignupPage`.
- `redirectTo: ${origin}/auth/callback` — no `?gym` tag, no `?return`. So **Google login from inside a member context is impossible** — there's no Google button on `GymLoginPage` at all.
- All post-OAuth routing flows through `AuthCallbackPage.routeUser`. Strangers signing in with Google for the first time and not matching any member/trainer row get routed to `/create-gym` (owner onboarding). This is intentional for owners, surprising for everyone else. The "wrong audience" risk you've mitigated for email signups (`?gym` tag) does **not** apply to Google.

---

## 10. Gym Website Auth

### 10.1 Shared substrate

`GymLoginPage` and `GymJoinPage` use the **same** `supabase.auth.*` calls and the **same** `findMember*` / `findTrainerInvite*` functions as the SaaS auth. They differ only in:

- Layout (branded with gym theme via `--gym-*` CSS vars from `GymLayout`)
- Cross-gym guards that explicitly compare matched row's `gym_id` to `useGym().gym.id`
- Use of `?return=` for member deep-links
- Use of `?gym=<slug>` in the `emailRedirectTo` for the post-confirm callback

### 10.2 Where they overlap improperly

1. **Profile creation lives in the page itself.** GymLoginPage:138-176 inlines all the link-as-member-or-trainer logic. Same code, different file, as AuthCallback. → Bug fix in one is invisible in the other (e.g., the phone-fallback path was added to AuthCallback only).
2. **`refreshProfile` is called from the gym page** to close the race that AuthContext caused. The gym page knows nothing about why this is needed — it's there because someone fixed a "page doesn't render after login" bug. Coupling between layers.
3. **GymLoginPage explicitly seeds `setAccessToken`** before its data queries. SaaS LoginPage doesn't. → Implies SaaS LoginPage was written first, and the data-client model evolved later, but the older code wasn't updated. A future SaaS LoginPage change that issues a data query immediately after sign-in could surface the same bug GymLoginPage already worked around.
4. **Branding context is read from `useGym()`** — but `useGym()` is only available because `GymLayout` mounts `GymProvider`. If you ever want a "gym-aware login" hosted at a different URL (e.g. `gymmobius.app/login?gym=…`), the page would need either its own context resolver or a new wrapper.

### 10.3 Branding/context confusion

- Members who **accidentally use SaaS `/login`** instead of `/iron-paradise/login` will succeed (auto-link picks up their member row) and land on `/member-app` — with no gym branding on the page they came from. Two valid login URLs for the same account, with different polish.
- The "wrong gym portal" cross-gym guard exists in **GymLoginPage** and **AuthCallback** but NOT in **SaaS LoginPage**. A member whose email is in gym A signing in at SaaS `/login` (which they shouldn't, but can) gets correctly routed to `/member-app` — but if they belong to gym B and we silently linked them to gym A's profile (because that's what existed first), they'd never see the cross-gym warning.

---

## 11. Domain + Subdomain Auth

### 11.1 Behavior matrix

| Host kind | URL example | `/login` resolves to | Session cookie scope | Reset link target |
|---|---|---|---|---|
| `main` | `gymmobius.app` | SaaS `LoginPage` | `.gymmobius.app` (per-origin) | `gymmobius.app/reset-password` |
| `main` with path slug | `gymmobius.app/iron-paradise/login` | `GymLoginPage` | `gymmobius.app` | `gymmobius.app/reset-password` |
| `subdomain` | `iron-paradise.gymmobius.app/login` | `GymLoginPage` (via TenantRoutes) | `iron-paradise.gymmobius.app` | `iron-paradise.gymmobius.app/reset-password` (but `/reset-password` doesn't exist in TenantRoutes!) |
| `custom` | `ironparadise.com/login` | `GymLoginPage` | `ironparadise.com` | `ironparadise.com/reset-password` (also missing in TenantRoutes!) |
| `localhost` | `localhost:5173/iron-paradise/login` | `GymLoginPage` | `localhost` | `localhost:5173/reset-password` |

### 11.2 Critical issues this exposes

1. **`/reset-password` is missing from `TenantRoutes`.** A member who clicks a reset link generated from `iron-paradise.gymmobius.app/login` lands on `iron-paradise.gymmobius.app/reset-password` → **404 / route not found** since TenantRoutes only contains `gymChildRoutes`. They have no recovery path.
2. **`/auth/callback` is missing from `TenantRoutes`.** Email-confirmation links generated when signup happens on a subdomain land on `{subdomain}/auth/callback` → also no route. (Today this works only because `GymJoinPage` builds `redirectTo: ${window.location.origin}/auth/callback` which on the subdomain origin would 404.) Verify by attempting a fresh signup from a subdomain — likely already broken.
3. **Session is per-origin.** A member with sessions on `gymmobius.app` cannot use them on `iron-paradise.gymmobius.app` or `ironparadise.com`. You have NO single-sign-on across subdomains today. If the product expects "sign in once at the gym site, use any tenant URL," that's a separate feature you haven't built.
4. **OAuth callback URLs must be whitelisted in Supabase Auth** for every host. Adding a new custom domain requires manually updating Supabase's "Redirect URLs" list. There's no automation for that today.
5. **Hard-coded `${window.location.origin}` redirects** (in `signInWithGoogle`, `signUpWithEmail`, `resetPasswordForEmail`) mean every host has its own callback URL — which is good for isolation, bad because every URL must be allowlisted.

---

## 12. Architecture Classification

This is **hybrid auth with context-mixing**.

- **Auth substrate:** single (one Supabase project, one `auth.users` table).
- **Frontend apps:** three (SaaS, member, trainer) bundled into one React app with two login surfaces.
- **Tenancy:** path-based on main host, host-based on subdomain/custom — and the React router knows about that *before* it ever sees an auth state, via `HOST_KIND`.
- **Role discrimination:** application-layer, post-login, via `users.role` join.

**Architectural weaknesses:**

1. One callback ≠ one intent. The callback infers what the user wanted (owner signup vs member signup vs trainer signup vs OAuth login vs email confirm) from URL params and DB state. Inference is fragile.
2. Two login pages share 90% of the same logic, copy-pasted not shared. Drift is inevitable.
3. Onboarding rules live in five places (ProtectedRoute, CreateGymPage, BillingPage, OnboardingPage, AuthCallback). Adding a new step (e.g., `theme_chosen`) would require touching all five.
4. AuthContext has special-case escape-from-React redirects to handle a state-machine bug that the routing layer can't solve. That escape hatch will be needed again every time a new "weird state" emerges.
5. The data client's empty-string-token bug is a class of error that will recur unless the contract changes.

**Scalability risks:**

- Each new role (e.g. `branch_manager`, `receptionist`) compounds the role-routing matrix in 4 places.
- Each new tenant-host type (e.g. `*.partner.gymmobius.app` reseller subdomains) breaks `HOST_KIND` assumptions and forces another branch in `TenantRoutes`.
- The member-app today has *no* tenant-aware URL. The day a member belongs to two gyms (multi-gym membership), the routing can't represent it.

---

## 13. Technical Debt — Ranked

### CRITICAL

1. **`/reset-password` and `/auth/callback` not present in TenantRoutes.** Member signup AND reset from a subdomain are likely broken today. Highest priority verify.
2. **Reset link redirects to SaaS host for gym members.** UX-broken regardless of routing — they end up on the wrong site.
3. **Member-app has no tenant URL.** Locked in to "one auth = one gym" forever unless changed.
4. **Empty-string token bug** in `supabaseData`'s `accessToken` callback. Latent — any code path that issues a `functions.invoke` before AuthContext finishes initializing will fail with `UNAUTHORIZED_NO_AUTH_HEADER`.
5. **Onboarding logic duplicated in 4-5 places.** Will cause subtle bugs as steps evolve.

### MEDIUM

6. **AuthCallback ↔ GymLoginPage duplicate the invite-claim tree.** Bugs (e.g., phone fallback) already exist in one but not the other.
7. **`createUserProfile(role)` has no server-side enforcement** that the role being assigned matches an actual invite/membership. Mitigated by app-layer auto-detection but no defense in depth.
8. **`LoginPage` always routes to `/owner-dashboard`** — flash + role bounce for non-owners.
9. **AuthContext's `window.location.replace` escape hatch** is the only path that survives session-vs-router races. If a similar race emerges elsewhere, the fix will be ad-hoc again.
10. **`refreshProfile()` called explicitly in 5 spots** to close races AuthContext should own internally.
11. **Google OAuth has no gym/member context awareness.** Strangers get owner onboarding.

### LOW

12. Dead `sendMagicLink` and deprecated phone-OTP exports.
13. Hard-coded `${origin}` in redirect URLs — works but every host must be allowlisted in Supabase manually.
14. `RESET` route lacks both `PublicRoute` and `ProtectedRoute` — by design, but easy to break.
15. EmailRequiredGuard only protects the dashboard layout — legacy phone-only owners can still hit `/create-gym` and `/billing` while skipping email setup.
16. `gym:lastSlug` localStorage key has no expiry. If a user is on five different gyms over a year, the key always holds the last one — fine today, but could mis-route a deleted member to a gym they're no longer associated with.

---

## 14. Recommended Separation Strategy (advisory only)

Goal: split **SaaS Platform Auth** from **Gym App Auth** so each has clear boundaries, single login surface, and predictable routing.

### Proposed boundary lines

```
┌─────────────────────────────────────┐    ┌─────────────────────────────────────┐
│      SaaS Platform Auth             │    │       Gym App Auth                  │
│  (gymmobius.app)                    │    │  (subdomain or custom domain)       │
├─────────────────────────────────────┤    ├─────────────────────────────────────┤
│ Surfaces:                           │    │ Surfaces:                           │
│  /login           owner only        │    │  /login           member + trainer  │
│  /signup          owner only        │    │  /join            member signup     │
│  /reset-password                    │    │  /reset-password  (tenant-scoped)   │
│  /auth/callback   (SaaS scope)      │    │  /auth/callback   (tenant scope)    │
│  /create-gym      onboarding        │    │                                     │
│  /billing         subscription      │    │ Roles served:                       │
│  /onboarding                        │    │  member, trainer                    │
│                                     │    │                                     │
│ Roles served:                       │    │ Routing:                            │
│  owner                              │    │  Home → /member-app or /trainer    │
│                                     │    │  All tenant-aware                  │
│ Routing:                            │    │                                     │
│  Always → /owner-dashboard          │    │ Branding:                           │
│                                     │    │  Always per-gym                    │
└─────────────────────────────────────┘    └─────────────────────────────────────┘
                  │                                          │
                  └──────────┬───────────────────────────────┘
                             ▼
                  Shared backend:
                   • Supabase auth.users (single)
                   • Shared invite/member-link service
                   • RLS still keyed off users.role + gym_id
```

### What this implies for the migration

- **One callback per surface.** Owner callback only owner-routes; tenant callback only member/trainer-routes. Disambiguation by URL (which host or which path prefix), never by row lookup.
- **`createUserProfile` becomes role-specific.** `createOwnerProfile`, `createMemberProfile`, `createTrainerProfile` — each enforces preconditions server-side via a SECURITY DEFINER RPC.
- **Routing config split.** Two routers, two `<App>` shells, one shared `AuthProvider` (since auth substrate is shared) but separate `RoleGuard` per app — each guard knows only its role universe.
- **Onboarding state machine** moves into a single `onboardingMachine` (or DB-stored state) read by ONE component, not four pages.
- **Tenant-aware member app URL.** `/member-app` becomes `/{slug}/app` or moves entirely to subdomain. `useGym()` and `useAuth()` no longer need to agree by accident.
- **Per-tenant reset flow.** Reset email's `redirectTo` is computed from the originating host, not the SaaS origin. Tenant callback page handles the recovery session.

### What stays single

- Supabase project + `auth.users`.
- RLS policies on tenant tables (`gym_id`-scoped).
- Database schema and edge functions.
- Public gym site content rendering (`GymLayout`, `GymProvider`, gym-resolution by host).

---

## 15. Refactor Risk Assessment

| Move | Risk | Why |
|---|---|---|
| Move `/reset-password` and `/auth/callback` into `TenantRoutes` | **LOW** | Pure addition. No existing flow breaks. |
| Make GymLoginPage / GymJoinPage send reset to tenant origin | LOW | Single-line change per page. |
| Move owner-only routes off of main host, *or* fence them under a guard that checks role first | MEDIUM | LoginPage's `navigate('/owner-dashboard')` still works for owners; non-owners need a different landing. |
| Extract invite-claim logic into a shared service | LOW | Pure dedup. Both call sites pass the same inputs. |
| Centralise onboarding rules into one component or state machine | MEDIUM | All five places must read from the same source. Risk: missing one means a step transition that doesn't fire. |
| Split `/auth/callback` into owner-callback and tenant-callback | HIGH | Many email links already in the wild point to `/auth/callback` without `?gym`. Old links must keep working — keep the legacy callback alive as a router that disambiguates and 302s. |
| Move member-app to a tenant URL | HIGH | Every external link, every bookmark, every push-notification deep-link breaks. Need a redirect strategy with TTL. |
| Replace `LoginPage`'s blind `/owner-dashboard` navigate with role-aware routing | LOW-MED | Need to ensure newly-created profiles have role set before redirect (race exists today). |

### Operational risks

- Any change to `redirectTo` URLs requires the corresponding URL to be in Supabase Auth's allowed redirect list.
- Email-confirmation links that are already-in-flight in users' inboxes will use the OLD redirect format. Leave the old callback alive for at least 30 days post-cutover.
- Razorpay webhook + reset emails + magic-link emails all use `redirectTo` URLs — audit all three together.

---

## 16. Safe Migration Strategy

A staged sequence that avoids touching production auth state until late:

### Phase 0 — Fix the broken-today items first (no architecture change)

1. Add `/reset-password` and `/auth/callback` routes to `TenantRoutes`.
2. Compute reset `redirectTo` per host (`window.location.origin` is fine on tenant hosts).
3. Add an enum-or-CHECK constraint on `users.role`.
4. Patch `supabaseData.accessToken` callback to return `null` not `''` so the anon-key fallback works.

### Phase 1 — Internal refactor only (no user-facing change)

5. Extract invite-claim flow into `services/auth/linkInviteOrMember.js`. Both AuthCallback and GymLoginPage call it.
6. Extract onboarding state checks into `lib/onboarding.js` (`getNextRoute(profile)`) — replace the duplicated logic in ProtectedRoute / CreateGymPage / BillingPage / OnboardingPage / AuthCallback.
7. Make `LoginPage` use `roleToHome(role)` after sign-in instead of hardcoded `/owner-dashboard`.

### Phase 2 — Add tenant-aware auth surface (additive)

8. Mount `/auth/callback` AND `/reset-password` AND `/login` under `TenantRoutes` with tenant-aware routing. The existing SaaS routes remain.
9. New emails (signups, resets) from tenant hosts use tenant redirect URLs. Existing flows untouched.

### Phase 3 — Role boundaries

10. Add `ProtectedRoute` variant or wrapper that asserts the route is on the right host class (`HOST_KIND === 'main'` for `/owner-dashboard`, etc.).
11. Add a server-side RPC `link_member_user_row_for_self(p_member_id)` that lets members self-claim only matching `auth.uid()` invites (further hardens `createUserProfile`).

### Phase 4 — Move user-facing surfaces

12. Announce: members and trainers should sign in at their gym portal. SaaS `/login` continues to accept them with a redirect-to-gym-portal message.
13. Update email templates so links match the originating surface.

### Phase 5 — Hard split

14. SaaS `/login` rejects non-owner roles with a "wrong portal" message + deep-link to the correct gym portal.
15. Member-app and trainer-dashboard move under tenant URLs (`/{slug}/app`, `/{slug}/trainer`). Old `/member-app` and `/trainer-dashboard` URLs 301 to the tenant variant.
16. Decommission shared SaaS callback path. Each surface owns its own.

### Rollback plan

- Phases 0-3 are individually revertable via git revert. None touch DB state.
- Phase 4-5 changes redirect URLs in Supabase Auth allowlist — keep old ones until at least 60 days after the last email link with that URL was sent.
- Member-app URL migration needs a redirect table (`/member-app → /{slug}/app`) that can stay in place permanently — cheap to keep.

---

## 17. Summary — Fix Before Refactoring

1. `/reset-password` and `/auth/callback` missing from tenant routes — almost certainly broken today on subdomains.
2. Reset link wrong destination for gym members — broken UX.
3. `supabaseData` empty-token bug — latent gateway 401s waiting to happen.
4. Onboarding logic duplicated 4-5x — refactor before adding any new step.
5. AuthCallback/GymLoginPage duplicate the invite tree — extract first, then split surfaces.

Once these are addressed, the SaaS/Gym surface split can proceed without untying knots mid-migration.

---

## Appendix — File Quick-Reference Index

Use this to jump to the exact source of every behavior referenced in the audit.

| Concern | File |
|---|---|
| Route table + host-kind branching | `src/App.jsx` |
| Route home + onboarding gate | `src/components/layout/ProtectedRoute.jsx` |
| Already-signed-in redirect | `src/components/layout/PublicRoute.jsx` |
| Email-required legacy gate | `src/components/auth/EmailRequiredGuard.jsx` |
| Auth state + neuter escape | `src/store/AuthContext.jsx` |
| Tenant gym resolver | `src/store/GymContext.jsx` |
| Host detection (main/subdomain/custom) | `src/lib/host.js` |
| Dual Supabase clients | `src/services/supabaseClient.js` |
| Auth API wrappers | `src/services/authService.js` |
| Profile + invite + member-link logic | `src/services/userService.js` |
| SaaS login form | `src/pages/auth/LoginPage.jsx` |
| SaaS signup form | `src/pages/auth/SignupPage.jsx` |
| Email-confirm + Google OAuth callback | `src/pages/auth/AuthCallbackPage.jsx` |
| Reset password page | `src/pages/auth/ResetPasswordPage.jsx` |
| Owner onboarding step 1 | `src/pages/auth/CreateGymPage.jsx` |
| Owner onboarding step 2 (plans/trainers) | `src/pages/auth/OnboardingPage.jsx` |
| Owner billing | `src/pages/auth/BillingPage.jsx` |
| Gym-branded login | `src/pages/gym/GymLoginPage.jsx` |
| Gym-branded signup | `src/pages/gym/GymJoinPage.jsx` |
| Member app shell + bottom nav | `src/components/layout/MemberLayout.jsx` |
| Trainer dashboard shell | `src/components/layout/TrainerLayout.jsx` |
| Owner dashboard shell + EmailRequiredGuard mount | `src/components/layout/DashboardLayout.jsx` |
| Owner logout from member-side | `src/pages/member/MemberProfilePage.jsx` |
| Owner logout from trainer-side | `src/pages/trainer/TrainerSettingsPage.jsx` |
| Edge function owner-auth helper | `supabase/functions/_shared/auth.ts` |
