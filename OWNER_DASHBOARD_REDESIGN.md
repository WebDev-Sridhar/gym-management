# Gymmobius Owner Dashboard — Redesign Specification

**Type:** Production-ready architecture + UX specification (no implementation code).
**Author intent:** Replace the current "cards + charts" overview with a **decision-making dashboard** that answers the 10 questions an owner has every morning.
**Design north star:** Stripe / Linear / Shopify home — calm, dense-but-clean, action-first, purple-branded.
**Last updated:** 2026-06-10

---

## 0. Design philosophy (the rule everything follows)

> **The current dashboard tells the owner what *is*. The new dashboard tells them what to *do*.**

Three principles, applied without exception:

1. **Actions outrank analytics.** Anything the owner can act on (a member who hasn't paid, a membership expiring tomorrow) sits *above* anything they can only look at (a revenue bar chart). Charts move down or out.
2. **One screen, one scan, one decision.** The owner should be able to open the app, scan the top third on a phone, and know whether they need to do anything in the next 5 minutes — without scrolling.
3. **Every number is a doorway.** No dead metrics. If a KPI shows "7 expiring soon," tapping it goes straight to the filtered list. A number you can't act on doesn't earn its place.

### What gets removed from today's dashboard

| Current element | Verdict | Why |
|---|---|---|
| 4 generic stat cards (Total / Active / Revenue / Expiring) | **Replaced** | "Total Members" and "All-time Revenue" are vanity; they never change a decision |
| "Revenue Overview" bar chart (6 months) | **Demoted** | Trend belongs in Analytics, not the morning triage screen |
| "Membership Overview" 4-tile block | **Merged** into Membership Health |
| Recent Activity (7 rows) | **Kept, demoted** | Useful but passive — moves to the bottom |
| Quick Actions (4 buttons) | **Re-ranked + made sticky on mobile** | Right idea, wrong priority order |

### What's genuinely new

- **Action Center** — the single most important addition; a prioritized, dismissible to-do list built from real operational state.
- **Today's Snapshot** — "what happened since I last looked," time-boxed to today.
- **Ghost Member Intelligence** — turns the existing `fetchInactiveMembers` risk engine into a first-class section with one-tap recovery.
- **Automation Intelligence** — proves Gymmobius is earning its subscription (reminders sent, delivery rate).
- **Subscription Usage** — WhatsApp quota meter with an upgrade nudge at the right moment.

---

## 1. Dashboard Layout — exact section ordering (top → bottom)

The order is deliberately **urgency-descending**: the owner reads top-to-bottom and naturally hits "must act" before "nice to know."

```
┌─ 0. ALERT STRIP (conditional) ───────── subscription expired / expiring, quota exhausted
├─ 1. HEADER ─────────────────────────── greeting, date, branch switcher
├─ 2. ACTION CENTER ──────────────────── "Needs your attention" — THE priority block
├─ 3. TODAY'S SNAPSHOT ───────────────── what happened today (5 micro-metrics)
├─ 4. MONEY ──────────────────────────── collected vs outstanding vs expected (collection rate)
├─ 5. MEMBERSHIP HEALTH  │  ATTENDANCE HEALTH ── two-up on desktop, stacked on mobile
├─ 6. GHOST MEMBER INTELLIGENCE ──────── 7+ / 14+ / 30+ day absence buckets + recover action
├─ 7. AUTOMATION INTELLIGENCE  │  SUBSCRIPTION USAGE ── two-up; proves ROI + quota meter
├─ 8. UPCOMING REVENUE ───────────────── next-7-day expiries + expected ₹ + follow-up list
├─ 9. RECENT ACTIVITY ────────────────── passive feed, collapsed by default on mobile
└─ 10. QUICK ACTIONS ─────────────────── sticky bottom bar on mobile; inline grid on desktop
```

**Rationale for ordering vs. the prompt's section numbering:** the prompt lists KPIs first, but a pure KPI row is analytics, not decisions. We fold the few KPIs that *matter* into Today's Snapshot (#3) and Money (#4), and lead with the Action Center (#2). This is the single biggest departure from a "traditional gym dashboard."

---

## 2. KPI Section — the metrics that survive

We do **not** keep a standalone KPI row. Instead, exactly **five high-value KPIs** are distributed where they drive action. Each is a tappable tile.

| # | Title | Value | Supporting text | Icon | Click action | Data source | Lives in |
|---|---|---|---|---|---|---|---|
| 1 | **Needs Attention** | count of open action items (e.g. `12`) | "3 urgent" (red sub-count) | `BellRing` | Scrolls/expands Action Center | `get_owner_dashboard.action_counts` | Header badge + Action Center |
| 2 | **Collected Today** | `₹8,400` | "6 payments · vs ₹6,100 yesterday" | `IndianRupee` | → Payments (filter: today, paid) | `payments` where `paid_at::date = today` | Today's Snapshot |
| 3 | **Active Members** | `184` | "↑ 5 this week · 88% of total" | `Users` | → Members (filter: active) | `members` status='active', not deleted | Membership Health |
| 4 | **Outstanding** | `₹14,200` | "9 members owe you" | `AlertTriangle` | → Payments (filter: pending) | `payments` pending + verification_pending | Money |
| 5 | **Expiring (7d)** | `7` | "₹10,500 at risk" | `CalendarClock` | → Members (filter: expiring ≤7d) | `members` active, expiry within 7d | Upcoming Revenue |

**Removed KPIs and why:** "Total Members" (vanity — only growth matters, surfaced as the ↑ delta on Active), "All-time Revenue" (vanity — never actionable; the owner cares about *today* and *this month*).

**KPI visual spec:**
- Card: `bg-white rounded-xl border border-gray-200 p-5`, hover `border-gray-300` + subtle shadow to signal clickability.
- Value: `text-3xl font-bold text-gray-900 tracking-tight`.
- Icon chip: `w-11 h-11 rounded-xl` tinted by semantic color (members=indigo, money=green, warning=amber, risk=red, brand=violet).
- Supporting text uses a colored delta token (`↑` green / `↓` red) — never a full chart inside a KPI.

---

## 3. Today's Snapshot — "what happened today"

A single horizontal strip of **five compact micro-metrics**, separated by hairline dividers — think Stripe's "Today" row. This is the owner's "since I last looked" glance.

**Metrics (left → right):**

| Metric | Value | Sub | Source | Tap |
|---|---|---|---|---|
| Check-ins | `42` | "live" pulse dot when >0 in last hour | `attendance` today count | → Attendance |
| Revenue | `₹8,400` | "6 payments" | `payments` paid today | → Payments (today) |
| New members | `2` | "+ self-reg pending" if any | `members` created today | → Members (recent) |
| Renewals | `4` | "₹6,000" | `payments` paid today linked to existing member | → Payments (today) |
| Pending collections | `₹14,200` | "9 due" (amber) | `payments` pending sum | → Payments (pending) |

**Exact UI:**
- Container: `bg-white rounded-xl border border-gray-200`, one row on desktop (`flex`, each cell `flex-1` with `divide-x divide-gray-100`), 2×3 grid wrap on small tablets, horizontal scroll-snap carousel on phones (peek the next metric to signal scrollability).
- Each cell: tiny uppercase label (`text-[11px] text-gray-400 font-medium tracking-wide`), value (`text-xl font-bold text-gray-900`), one-line sub (`text-xs`).
- **Freshness affordance:** a small `Updated 2m ago` timestamp + manual refresh icon at the strip's right edge. A green pulse dot appears on Check-ins if someone scanned in the last 15 minutes (the only "realtime-ish" cue on the page).
- **Empty/early-morning state:** at 6 AM most values are `0`. Show `—` with a muted "Nothing yet today" rather than a wall of zeros, so the screen doesn't feel broken.

---

## 4. Action Center — the heart of the dashboard

A prioritized, **sorted-by-urgency** list of things the owner can clear. This replaces "go hunting across 5 pages." Each row is a one-tap action.

### Priority model

Each action item has a computed **urgency score**; the list renders top-to-bottom by score and is capped at the top ~6 with a "View all (N)" expander.

| Priority | Item type | Trigger | Urgency | Primary action |
|---|---|---|---|---|
| 🔴 P0 | **Overdue payments** | membership expired AND payment still pending | Highest | "Remind" (WhatsApp/email) or "Collect" |
| 🔴 P0 | **Expiring today** | active membership, expiry = today | Highest | "Send reminder" |
| 🟠 P1 | **Pending UPI verification** | payment status = `verification_pending` | High (member thinks they paid) | "Verify" |
| 🟠 P1 | **Expiring in 1–3 days** | active, expiry ≤ 3d | High | "Send reminder" |
| 🟠 P1 | **Pending registrations** | rows in `pending_member_registrations` | High (a prospect is waiting) | "Review" → approve/reject |
| 🟡 P2 | **Failed reminders** | notification `channel_results` all failed/skipped | Medium | "Retry" / "Why?" |
| 🟡 P2 | **Ghost: 14+ days absent** | from inactive engine, risk=medium/high | Medium | "Win back" |
| 🟢 P3 | **Open support reply** | support ticket with staff reply unread | Low | "Open" |

### UI spec

- Header: **"Needs your attention"** + a count chip. If zero items: a celebratory empty state — *"You're all caught up 🎉 Nothing needs you right now."* (This is a feature, not filler — "inbox zero" is the emotional payoff.)
- Each row:
  ```
  [icon chip]  Primary text (bold)               [Action button]  [⋯]
               Secondary context · ₹ / days / name
  ```
  - Icon chip color = priority color.
  - Primary action button is the **highest-value verb** ("Remind", "Verify", "Review"), styled `bg-indigo-600 text-white` for the top item, `bg-indigo-50 text-indigo-600` for the rest (visual hierarchy: only the most urgent gets the solid button).
  - `⋯` opens a small menu: Snooze (hide for 24h), Dismiss, Open record.
- **Batch action:** a sticky mini-header *"Remind all 5 expiring"* when ≥3 items share an action — one tap fires reminders to the whole group (respects WhatsApp quota; falls back to email; shows "3 sent via WhatsApp, 2 via email").
- **Dismiss/snooze persistence:** stored per-owner in a lightweight `dashboard_dismissals` table (item key + until-timestamp) so a dismissed item doesn't reappear on refresh.

### Why this is the centerpiece

It directly answers prompt questions **#2 (what needs attention), #6 (who hasn't paid), #10 (anything to do right now)** — and it's the one block that, if the owner only ever looked at this, would still run their gym.

---

## 5. Revenue Section — money, not vanity charts

Three numbers + one progress bar. **No time-series chart here** (that's Analytics).

```
┌─ This Month ─────────────────────────────────────────────┐
│  Collected            Outstanding         Expected (7d)    │
│  ₹1,24,000            ₹14,200             ₹10,500           │
│  ↑ 12% vs last month  9 members owe       7 renewals due    │
│                                                            │
│  Collection rate this month   ▓▓▓▓▓▓▓▓▓░  89%               │
│  ₹1,24,000 collected of ₹1,38,200 billed                   │
└──────────────────────────────────────────────────────────┘
```

| Widget | Definition | Source |
|---|---|---|
| **Collected (this month)** | Σ `payments.amount` where status=paid, `paid_at` in current month | `payments` |
| **Outstanding** | Σ `payments.amount` where status ∈ (pending, verification_pending) | `payments` |
| **Expected (next 7d)** | Σ plan price for active members expiring ≤7d (renewal pipeline) | `members` ⨝ `plans` |
| **Collection rate** | collected ÷ (collected + outstanding) for the period, as a % bar | derived |

**UI:** three values across the top (stacked on mobile), a single **collection-rate progress bar** in brand violet underneath. The bar is the hero — a gym owner instantly understands "89% collected" as a report card. Bar turns amber <75%, red <50%.

**Deliberately excluded:** payment-method pie, top-payers, plan-distribution — all live in Analytics. The dashboard answers *"am I collecting my money?"*, not *"analyze my revenue."*

---

## 6. Membership Health

A compact composite card answering **#4 (how many active) and #8 (growing or declining)**.

```
┌─ Membership Health ──────────────────────────────────────┐
│  184 active            88% active rate                     │
│  ─────────────────────────────────────────                │
│  Active 184  │  Expiring 7  │  Inactive 23  │  Expired 12  │
│  [████████████████░░░░]  segmented bar (active→at-risk)    │
│                                                            │
│  Growth   ↑ +9 this month   (+5%)   ·  ↓ 4 churned         │
└──────────────────────────────────────────────────────────┘
```

| Field | Definition | Source |
|---|---|---|
| Total / Active / Inactive / Expired | status buckets, not deleted | `fetchMembershipAnalytics.statusCounts` |
| Expiring soon | active, expiry within 7d | same |
| **Growth rate** | (new this month − churned this month) ÷ active at month start | new RPC field |
| Segmented bar | active vs at-risk vs lapsed as one stacked bar | derived |

**UI:** a **single horizontal segmented bar** (green active / amber expiring / gray inactive / red expired) — one glance shows the health mix. Each segment is tappable → filtered member list. The growth line uses ↑/↓ deltas, never a chart.

---

## 7. Attendance Health

Sits beside Membership Health (two-up on desktop). Answers *"is the gym actually being used?"* — a leading indicator of churn.

```
┌─ Attendance ─────────────────────────────────────────────┐
│  Today 42        Avg/day 38        This week ▁▃▅▂▆▇▄        │
│  ─────────────────────────────────────────                │
│  Attendance rate (7d)   46%   of active members            │
│  Busiest: Mon 6–8 PM                                       │
└──────────────────────────────────────────────────────────┘
```

| Field | Definition | Source |
|---|---|---|
| Today | check-ins today | `attendance` today |
| Avg/day | mean over last 7 days | `fetchAttendanceAnalytics.avgPerDay` |
| Week trend | 7-day sparkline (tiny, no axes) | `byDay` |
| **Attendance rate** | unique members who checked in last 7d ÷ active members | new RPC field |
| Busiest slot | peak day+hour | `busiestDow` + `busiestHour` |

**UI:** the only "chart" allowed on the dashboard is a **7-bar sparkline** (no axes, no labels, ~40px tall) — it's a glanceable shape, not analytics. Attendance rate is the headline number because a low rate predicts churn before payments do.

---

## 8. Ghost Member Intelligence

A dedicated retention section built on the existing `fetchInactiveMembers` risk engine (which already computes `daysInactive` and `riskLevel`). Answers **#7 (who's becoming inactive)**.

```
┌─ At-risk members ────────────────────  [Win back all ▸] ──┐
│                                                            │
│   ●  7+ days absent        8 members      [Nudge]          │
│   ●  14+ days absent       5 members      [Nudge]          │
│   ●  30+ days absent       3 members      [Win back]       │
│                                                            │
│   Recently slipping:                                       │
│   Ravi K.     last seen 9d ago   ₹ active   [Message]      │
│   Priya S.    last seen 16d ago  expired    [Message]      │
│   Arun M.     last seen 33d ago  expired    [Message]      │
│                                  View all 16 at-risk ▸     │
└──────────────────────────────────────────────────────────┘
```

| Bucket | Definition | Recommended action |
|---|---|---|
| **7+ days** (low risk) | absent 7–13d, still active | Gentle "we miss you" nudge — usually recoverable |
| **14+ days** (medium) | absent 14–29d, or expiring | Personal WhatsApp + offer to talk |
| **30+ days** (high) | absent 30+d, or expired | Win-back: discount/check-in call; last chance before written off |

**Source mapping:** `fetchInactiveMembers` already returns `riskLevel` (low/medium/high), `daysInactive`, `isExpired`, name/phone/email — the bucket counts are a `GROUP BY` over its output. Note the **ghost-recall cron already messages members automatically at 5/14/30 days**, so this section's framing is *"the automation is working — here are the ones worth a personal touch."*

**UI:** three colored bucket rows (count + bucket action), then a short preview list of the most-recently-slipping members with per-row "Message." "Win back all" fires the ghost-recall template to the whole high-risk bucket (quota-aware). Each member row → member drawer.

---

## 9. Automation Intelligence — proving Gymmobius works

Answers **#9 (is automation working?)** — and quietly justifies the subscription, which reduces churn. Sits two-up with Subscription Usage.

```
┌─ Automation this month ──────────────────────────────────┐
│  248 reminders sent     94% delivered                      │
│  ─────────────────────────────────────────                │
│  WhatsApp 180   ·   Email 68   ·   Failed 14               │
│  ₹46,000 collected within 48h of a reminder*               │
│  *renewals paid shortly after an automated nudge           │
└──────────────────────────────────────────────────────────┘
```

| Metric | Definition | Source |
|---|---|---|
| Reminders sent | notifications this month, member-facing | `notifications` |
| Delivery rate | sent ÷ (sent + failed) across channels | `channel_results` |
| WhatsApp / Email split | by channel `status='sent'` | `channel_results` |
| Failed | all-channel failure rows | `channel_results` |
| **Collections after reminder** | paid payments whose member got a reminder in the prior 48h (attribution) | new RPC (correlation) |

**Honesty guardrail:** the "₹ collected after a reminder" is a **correlation, not proof of causation** — the copy says "within 48h of a reminder," not "because of." This keeps the claim defensible (matches the trust-audit posture used elsewhere in the product). If the attribution query proves too heavy for v1, **ship this section without that one line** and add it later — the delivery stats alone justify the section.

**UI:** two big numbers (sent, delivery %), a channel breakdown line, one ROI line. A green check chip when delivery ≥90%, amber when 70–90%, red <70% (delivery problems = WhatsApp template not approved → links to a fix guide).

---

## 10. Upcoming Revenue

The renewal pipeline for the next 7 days. Answers **#5 (who's about to expire)** with money attached.

```
┌─ Renewals due (next 7 days) ─────────────────────────────┐
│  7 memberships    ₹10,500 expected                         │
│  ─────────────────────────────────────────                │
│  Today      2   ₹3,000   [Remind both]                     │
│  Tomorrow   1   ₹1,500   [Remind]                          │
│  In 2–3d    2   ₹3,000   [Remind all]                      │
│  In 4–7d    2   ₹3,000                                     │
│                              View follow-up list ▸         │
└──────────────────────────────────────────────────────────┘
```

| Field | Definition | Source |
|---|---|---|
| Memberships expiring | active members, expiry within 7d, grouped by day-bucket | `members` ⨝ `plans` |
| Expected revenue | Σ plan price of those members | derived |
| Requires follow-up | of those, who has **not** received a reminder yet | `members` ⨝ `notifications` |

**UI:** day-bucketed rows (Today / Tomorrow / 2–3d / 4–7d), each with count + ₹ + a batch "Remind" button. The buckets nearest expiry get the solid button. A "follow-up list" expander shows individual members who haven't been reminded yet (the gap the automation hasn't covered — e.g. annual members, or quota-exhausted gyms).

---

## 11. Subscription Usage — quota meter + upgrade nudge

Answers *"am I about to hit a wall?"* and is the product's primary in-context upsell surface. Two-up with Automation Intelligence.

```
┌─ Your Gymmobius plan ────────────────────────────────────┐
│  Pro  ·  renews 5 Jul                    [Manage ▸]        │
│  ─────────────────────────────────────────                │
│  WhatsApp        ▓▓▓▓▓▓▓▓░░  2,460 / 3,000   540 left      │
│  Members         ▓▓▓▓▓▓░░░░  184 / 750                     │
│  Trainers        ▓▓▓░░░░░░░  3 / 10                         │
│                                                            │
│  ⚡ 82% of WhatsApp used — heavy month?  Upgrade to Premium │
└──────────────────────────────────────────────────────────┘
```

| Field | Definition | Source |
|---|---|---|
| Plan + renewal date | current subscription | `subscriptions` / `AuthContext` |
| WhatsApp quota | used / cap / remaining for the period | `fetchWhatsappQuota` |
| Members used | active count / plan cap | `PLAN_CAPS` + count |
| Trainers used | trainers / plan cap | `PLAN_CAPS` + count |

**Upgrade nudge logic (the "right moment" rule):**
- Show the nudge **only at ≥80%** of any quota (members, trainers, or WhatsApp). Below 80%, the meters show but no nudge — avoids nag fatigue.
- Copy is **pride-framed, not fear-framed**: *"82% of WhatsApp used — heavy month? Upgrade to Premium for 15,000/mo."* (matches the pricing-strategy guidance that quota gates should "read as growing-out-of-it pride.")
- One-click → Subscription page with the next tier pre-selected.
- **Solo Coach / post-trial:** instead of meters, show *"WhatsApp reminders are off on Solo Coach. Upgrade to Starter to turn them on."* with a single CTA.
- **Expired subscription:** this card is suppressed (the red alert strip at #0 takes over).

---

## 12. Quick Actions — re-ranked by real frequency

Current order (Add Member, Collect Payment, Mark Attendance, Analytics) is alphabetical-ish, not usage-ranked. Re-rank by how often an owner actually does each, per morning workflow:

| Rank | Action | Why this rank | Destination |
|---|---|---|---|
| 1 | **Collect Payment** | The money action — most frequent revenue task | Payments → collect modal |
| 2 | **Add Member** | Core growth action | Members → add modal |
| 3 | **Send Reminder** | NEW — promotes the #1 ROI feature to a first-class button | Payments (pending) / bulk remind |
| 4 | **Mark Check-in** | Front-desk action | Attendance |
| 5 | **Share QR / Registration link** | NEW — high-value, low-discoverability today | copy link sheet |
| 6 | **View Analytics** | Demoted — owners visit weekly, not daily | Analytics |

**UI:**
- **Desktop:** a 3×2 grid of soft-tinted buttons (existing pattern: `flex flex-col items-center gap-2 p-4 rounded-xl`, color-tinted backgrounds).
- **Mobile:** the top 4 become a **sticky bottom action bar** (thumb-reachable), the rest live behind a `+` sheet. (See §13.)

---

## 13. Mobile Design

Mobile-first is non-negotiable — the owner checks this on their phone between sets, at the desk, on the move.

### Layout transforms (desktop → mobile)

| Section | Desktop | Mobile |
|---|---|---|
| Alert strip | full-width banner | full-width, sticky under header |
| Header | greeting + date + branch switcher inline | greeting + branch switcher; date moves into a sub-line |
| **Action Center** | top block, ~6 rows | **stays #1**, rows full-width, action button right-aligned & thumb-sized (≥44px) |
| Today's Snapshot | 5-up divided row | horizontal **scroll-snap carousel** (peek next card) |
| Money | 3 values + bar | values stack vertically; collection bar full-width |
| Membership / Attendance | two-up | **stacked**, full-width each |
| Ghost Intelligence | full card | full card; preview list collapses to top 3 + "view all" |
| Automation / Subscription | two-up | stacked |
| Upcoming Revenue | day-bucket rows | same, full-width |
| Recent Activity | right column | **collapsed accordion** ("Recent activity ▸"), closed by default |
| Quick Actions | 3×2 grid | **sticky bottom bar** (top 4) + `+` sheet |

### Mobile-specific rules

- **Sticky bottom action bar:** Collect · Add Member · Remind · More(+). Always reachable; hides on scroll-down, reappears on scroll-up (Linear-style).
- **Section priority on small screens:** if the screen is short, the goal is that **Alert Strip + Action Center + Today's Snapshot** fill the first viewport. Everything below is progressive disclosure.
- **Tap targets:** all action buttons ≥44×44px; rows are fully tappable, not just the button.
- **No horizontal tables.** The Action Center and lists are card-rows, never scrolling tables, on mobile.
- **Pull-to-refresh** triggers a snapshot re-fetch; shows the "Updated just now" stamp.
- **Branch switcher** (multi-branch only) becomes a top dropdown pill; "All branches" is the default consolidated view.

---

## 14. Performance Strategy — load under 2 seconds

### The core decision: one RPC, not eight queries

Today's dashboard fires **4 separate service calls** (`fetchDashboardStats`, `fetchRecentActivity`, `fetchRevenueByMonth`, `fetchGymDetails`), each multiple sub-queries. The redesign needs ~15 distinct facts — firing 15 round-trips would blow the budget.

**Solution: a single Postgres RPC `get_owner_dashboard(p_gym_id, p_branch_id)` returning one JSON payload** with every number the dashboard needs. One network round-trip, server-side aggregation, RLS-safe.

```
get_owner_dashboard(gym_id, branch_id) → {
  today:        { checkins, revenue, new_members, renewals, pending_amount },
  money:        { collected_month, outstanding, expected_7d, collection_rate },
  membership:   { total, active, inactive, expired, expiring_7d, growth_month, churned_month },
  attendance:   { today, avg_7d, spark_7d[], rate_7d, busiest_dow, busiest_hour },
  ghosts:       { d7, d14, d30, preview[] },
  automation:   { sent_month, delivered, whatsapp, email, failed },
  upcoming:     { by_bucket[{label,count,amount}], needs_followup_count },
  actions:      { counts_by_type{}, top_items[] },
  quota:        { plan, whatsapp_used, whatsapp_cap, members_used, members_cap, trainers_used, trainers_cap, renews_at }
}
```

### Loading & rendering plan

| Technique | Application |
|---|---|
| **Single aggregate RPC** | One call returns the whole snapshot; target server time <300ms |
| **Skeleton-first paint** | Reuse the existing `Sk` skeleton; render layout immediately, hydrate on RPC return |
| **Stale-while-revalidate cache** | Extend the existing `useDashboardSnapshot` 60s in-memory cache to the full payload — instant paint on navigation back, refresh in background |
| **Section-level lazy load** | Action Center + Today + Money render from the first payload (above the fold). Recent Activity (and the optional attribution line) lazy-load on scroll / after idle via `requestIdleCallback` |
| **Code-split heavy bits** | The sparkline/recharts import is dynamically imported only when Attendance Health is in view; never blocks first paint |
| **Optimistic action UI** | Dismissing/snoozing an action item or sending a reminder updates the row instantly; the network call reconciles after |

### Realtime vs. polling (deliberately restrained)

- **No always-on realtime subscriptions** on the dashboard — they're a battery/connection cost for a screen that doesn't need second-by-second truth.
- **Refetch on window focus** (already implemented today) — the owner switches back to the tab → fresh numbers. Keep this.
- **Lightweight 60s poll only for two volatile counters** while the tab is visible and focused: today's check-ins and pending-verification count (cheap `head:true` counts). Pause polling when the tab is hidden (`document.visibilityState`).
- **Pull-to-refresh** on mobile for manual freshness.

### Indexes the RPC depends on (must exist for <2s)

- `members(gym_id, deleted_at, status, expiry_date)`
- `payments(gym_id, status, paid_at)` and `payments(gym_id, status)` for pending counts
- `attendance(gym_id, check_in)` and `attendance(gym_id, member_id, check_in)`
- `notifications(gym_id, created_at)` + the existing `channel_results` JSON path
- partial index on `members(gym_id, branch_id)` for the branch-filtered path

---

## 15. Database Requirements

### Reusable as-is (already exist)

| Need | Existing source |
|---|---|
| Core counts (total/active/expiring/revenue/checkins/trainers) | `fetchDashboardStats` (membershipService) |
| Recent activity feed | `fetchRecentActivity` |
| Revenue by month / by day / by method, pending & failed counts | `fetchRevenueAnalytics` (analyticsService) |
| Membership status buckets, new-in-range, plan distribution | `fetchMembershipAnalytics` |
| Attendance by day/dow/hour, avg, busiest | `fetchAttendanceAnalytics` |
| **Ghost/at-risk engine with risk levels** | `fetchInactiveMembers` ← powers §8 directly |
| Payment insights (pending dues, by plan) | `fetchPaymentInsights` |
| WhatsApp quota (used/cap/remaining) | `fetchWhatsappQuota` |
| Pending UPI verification count | `fetchVerificationPendingCount` (paymentService) |
| Pending self-registrations | `fetchPendingRegistrations` (memberRegistrationService) |
| Notification log w/ channel results | `notificationService` |
| Support tickets (owner) | `supportService` |
| Branch filtering helper | `applyBranchFilter` / `branchQuery` |

### New RPCs / queries needed

| New | Purpose | Notes |
|---|---|---|
| **`get_owner_dashboard(gym_id, branch_id)`** | The single aggregate snapshot (§14) | SECURITY DEFINER, RLS-scoped to caller's gym; returns JSON. The keystone deliverable. |
| **Today-scoped sub-aggregates** | check-ins / revenue / new / renewals / pending — all for `today` | Folded into the RPC; today's revenue must use `paid_at::date = current_date` at the gym's IST offset |
| **Expected-revenue (next 7d)** | Σ plan price for members expiring ≤7d, bucketed by day | `members ⨝ plans`; folded into RPC |
| **Growth rate** | new − churned this month ÷ active-at-month-start | needs "active at month start" — approximate from members created/expiry; folded into RPC |
| **Attendance rate (7d)** | distinct members checked-in 7d ÷ active | `COUNT(DISTINCT member_id)`; folded into RPC |
| **Automation delivery stats** | sent / delivered / by-channel / failed this month | aggregate over `notifications.channel_results` JSON; folded into RPC |
| **Reminder→payment attribution** (optional) | ₹ paid within 48h after a reminder | correlation join `payments ⨝ notifications`; **ship behind a flag — heaviest query, drop from v1 if slow** |
| **`dashboard_dismissals`** table + read | persist snooze/dismiss of action items | tiny table: `(gym_id, owner_id, item_key, dismissed_until)` |

### Expensive queries to AVOID

- ❌ **Per-member loops** for "last check-in" (the current `fetchInactiveMembers` pulls 90 days of attendance and reduces in JS — fine for the Analytics page, **too heavy to run inline on every dashboard load**). For the dashboard, compute ghost **bucket counts** server-side via a windowed aggregate (`MAX(check_in) per member` in SQL), and only fetch the **preview rows (top ~5)**, not the full at-risk list.
- ❌ **All-time revenue scans** every load — the current "all-time revenue" sums the entire payments table. Replace with **current-month** and **today** windows (bounded by `paid_at` index).
- ❌ **Fetching full member/payment/attendance rows** to count in JS — use `head:true` + `count:'exact'` or SQL aggregates. Never ship rows you'll only `.length`.
- ❌ **N+1 on notifications** to compute delivery rate — aggregate in one grouped query, not per-notification.
- ❌ **Realtime subscriptions** to `attendance`/`payments` — polling two cheap counters is far lighter than maintaining websocket channels.

---

## 16. React Component Architecture

### Page structure

```
OwnerDashboardPage  (route: /owner-dashboard)
│
├── <DashboardProvider>                  // context: snapshot data + refresh + dismissals
│   │
│   ├── <AlertStrip />                    // subscription expired/expiring, quota exhausted (conditional)
│   ├── <DashboardHeader />               // greeting, date, <BranchSwitcher/>, refresh + "updated Nm ago"
│   │
│   ├── <ActionCenter />                  // §4 — priority list
│   │     └── <ActionItem />              // row + primary action + ⋯ menu
│   │
│   ├── <TodaySnapshot />                 // §3 — 5 micro-metrics (carousel on mobile)
│   │
│   ├── <MoneyPanel />                    // §5 — collected/outstanding/expected + collection bar
│   │
│   ├── <div grid two-up>
│   │     ├── <MembershipHealth />        // §6 — segmented bar + growth
│   │     └── <AttendanceHealth />        // §7 — sparkline + rate  (recharts lazy-loaded)
│   │
│   ├── <GhostIntelligence />             // §8 — 7/14/30 buckets + preview + win-back
│   │
│   ├── <div grid two-up>
│   │     ├── <AutomationIntelligence />  // §9 — sent/delivery/ROI
│   │     └── <SubscriptionUsage />       // §11 — quota meters + upgrade nudge
│   │
│   ├── <UpcomingRevenue />               // §10 — renewal pipeline
│   │
│   ├── <RecentActivity />                // §12-legacy, demoted/collapsed
│   │
│   └── <QuickActions />                  // §12 — grid (desktop) / sticky bar (mobile)
│
└── <DashboardSkeleton />                 // shown until first RPC resolves
```

### Components (presentational, dumb where possible)

- **Primitives reused:** `StatCard`, `Sk` (skeleton), `BannerSlot`, `CustomSelect`, `Button`, `Dialog`, `Pagination`, `WhatsAppCTA`, `UpgradeRequiredModal`.
- **New shared primitives:** `<MetricStrip>`, `<SegmentedBar>`, `<QuotaMeter>`, `<Sparkline>` (lazy), `<ActionItemRow>`, `<UrgencyChip>`, `<DeltaBadge>` (↑/↓ colored).
- **Every count/metric tile** wraps a navigation intent (`onClick → navigate(filteredRoute)`).

### Hooks

| Hook | Responsibility |
|---|---|
| **`useOwnerDashboard()`** | Calls `get_owner_dashboard` RPC; returns `{ data, loading, error, refresh, lastUpdated }`. Wraps SWR-style cache. |
| **`useDashboardSnapshot()`** (existing) | Extend its 60s in-memory cache to hold the full payload; keep `invalidateDashboardSnapshot()` for mutation-triggered refresh. |
| **`useActionCenter()`** | Derives sorted action items from the snapshot + applies `dashboard_dismissals`; exposes `dismiss/snooze/resolve`. |
| **`useVolatileCounters()`** | The visible-tab 60s poll for check-ins + pending-verification only; pauses on `visibilitychange`. |
| **`useBranch()`** (existing) | Selected branch feeds the RPC param. |
| **`useWhatsappQuota()`** | Thin wrapper around `fetchWhatsappQuota` (or read from the RPC payload to save a call). |

### Contexts

- **`DashboardProvider`** — holds the snapshot, exposes `refresh()`, and broadcasts `lastUpdated`. Lets any child (e.g. Action Center after a reminder send) trigger a targeted re-fetch without prop-drilling.
- **`AuthContext`** (existing) — `gymId`, `subscription`, plan.
- **`BranchContext`** (existing) — `selectedBranchId`.

### Data-fetching strategy

1. On mount: `useOwnerDashboard()` checks the 60s cache → **instant paint if warm**, else skeleton + one RPC.
2. RPC payload hydrates **all** sections (no per-section fetches above the fold).
3. Recent Activity + optional attribution lazy-load after idle / on scroll.
4. Mutations (send reminder, verify payment, approve registration, dismiss action) update optimistically, then call `refresh()` which re-hits the RPC and re-caches.
5. Window-focus + pull-to-refresh + 60s volatile-counter poll keep it fresh without realtime sockets.

---

## 17. Final Dashboard Wireframe (full text)

### Desktop (≥1024px) — max-width 1200px, `space-y-6`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ⚠  Your subscription expires in 3 days — renew to keep access.   [ Renew Now ] │  ← conditional
└──────────────────────────────────────────────────────────────────────────────┘

  Good morning, Sridhar 👋                          [ All branches ▾ ]   ↻ Updated 2m ago
  Tuesday, 10 June 2026

┌─ Needs your attention ───────────────────────────────────────  12 items ──────┐
│ 🔴  Ravi K. — membership expired, ₹1,500 unpaid          [ Remind ]      ⋯     │
│ 🔴  2 memberships expire today                            [ Remind both ]  ⋯   │
│ 🟠  Priya S. tapped "I Paid" — verify ₹1,200 UPI          [ Verify ]      ⋯    │
│ 🟠  3 new registration requests waiting                   [ Review ]      ⋯    │
│ 🟡  2 reminders failed to send (WhatsApp template)        [ Fix ]         ⋯    │
│ 🟡  5 members absent 14+ days                             [ Win back ]    ⋯    │
│                                                              View all (12) ▸   │
└────────────────────────────────────────────────────────────────────────────────┘

┌─ Today ──────────┬──────────┬──────────┬──────────┬───────────────────────────┐
│ CHECK-INS        │ REVENUE  │ NEW      │ RENEWALS │ PENDING COLLECTIONS        │
│ 42 ● live        │ ₹8,400   │ 2        │ 4 ₹6,000 │ ₹14,200  (9 due)           │
└──────────────────┴──────────┴──────────┴──────────┴───────────────────────────┘

┌─ Money · this month ──────────────────────────────────────────────────────────┐
│  Collected ₹1,24,000 ↑12%   │   Outstanding ₹14,200 (9)   │  Expected 7d ₹10,500 │
│  Collection rate  ▓▓▓▓▓▓▓▓▓░ 89%   (₹1,24,000 of ₹1,38,200 billed)              │
└────────────────────────────────────────────────────────────────────────────────┘

┌─ Membership Health ─────────────────────┐ ┌─ Attendance ──────────────────────┐
│ 184 active            88% active rate    │ │ Today 42   Avg 38   ▁▃▅▂▆▇▄        │
│ [███████████░░░ active|expiring|lapsed]  │ │ Rate(7d) 46% of active            │
│ Active 184 · Expiring 7 · Inactive 23 ·  │ │ Busiest: Mon 6–8 PM               │
│ Expired 12        Growth ↑+9 (+5%)       │ │                                   │
└──────────────────────────────────────────┘ └───────────────────────────────────┘

┌─ At-risk members ───────────────────────────────────────────  [ Win back all ] ┐
│ ● 7+ days   8   [Nudge]    ● 14+ days   5   [Nudge]    ● 30+ days   3  [Win back]│
│ Ravi K.  9d ago · active    [Message]                                           │
│ Priya S. 16d ago · expired  [Message]              View all 16 at-risk ▸         │
└────────────────────────────────────────────────────────────────────────────────┘

┌─ Automation this month ─────────────────┐ ┌─ Your Gymmobius plan ─────────────┐
│ 248 sent      94% delivered              │ │ Pro · renews 5 Jul     [Manage ▸] │
│ WhatsApp 180 · Email 68 · Failed 14      │ │ WhatsApp ▓▓▓▓▓▓▓▓░░ 2,460/3,000   │
│ ₹46,000 collected within 48h of a nudge* │ │ Members  ▓▓▓▓▓▓░░░░ 184/750        │
│                                          │ │ Trainers ▓▓▓░░░░░░░ 3/10           │
│                                          │ │ ⚡ 82% WhatsApp used → Premium?    │
└──────────────────────────────────────────┘ └───────────────────────────────────┘

┌─ Renewals due (next 7 days) ──────────────────────────────────────────────────┐
│ 7 memberships · ₹10,500 expected                                               │
│ Today 2 ₹3,000 [Remind both] · Tomorrow 1 ₹1,500 [Remind] · 2–3d 2 [Remind all]│
│ 4–7d 2 ₹3,000                                          View follow-up list ▸    │
└────────────────────────────────────────────────────────────────────────────────┘

┌─ Recent activity ▾ ───────────────────────────────────────────────────────────┐
│ 💰 Payment from Arun — ₹1,500            2m ago                                 │
│ 🟣 New member: Kavya                     18m ago                                │
│ 🔵 Deepak checked in                     31m ago               View all ▸       │
└────────────────────────────────────────────────────────────────────────────────┘

┌─ Quick actions ───────────────────────────────────────────────────────────────┐
│ [ 💳 Collect ] [ ＋ Add Member ] [ 🔔 Send Reminder ]                           │
│ [ 📲 Mark Check-in ] [ 🔗 Share QR ] [ 📊 Analytics ]                           │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Mobile (<640px) — single column, sticky action bar

```
┌────────────────────────────────────┐
│ ⚠ Sub expires in 3 days   [Renew]  │  ← sticky
├────────────────────────────────────┤
│ Good morning, Sridhar 👋           │
│ Tue 10 Jun · [All branches ▾]  ↻   │
├────────────────────────────────────┤
│ NEEDS YOUR ATTENTION        12      │
│ 🔴 Ravi K. expired ₹1,500          │
│                        [ Remind ]  │
│ 🔴 2 expire today      [ Remind ]  │
│ 🟠 Verify ₹1,200 UPI   [ Verify ]  │
│ 🟠 3 registrations     [ Review ]  │
│              View all (12) ▸       │
├────────────────────────────────────┤
│ TODAY  ‹ swipe ›                    │
│ [Check-ins 42●][Revenue ₹8.4K][New 2]│  ← scroll-snap carousel
├────────────────────────────────────┤
│ MONEY · THIS MONTH                  │
│ Collected ₹1,24,000  ↑12%          │
│ Outstanding ₹14,200 (9)            │
│ Expected 7d ₹10,500                │
│ Rate ▓▓▓▓▓▓▓▓▓░ 89%                 │
├────────────────────────────────────┤
│ MEMBERSHIP HEALTH                   │
│ 184 active · 88%                   │
│ [███████░░ segmented]              │
├────────────────────────────────────┤
│ ATTENDANCE                          │
│ Today 42 · Avg 38 · ▁▃▅▂▆▇▄         │
│ Rate 46%                           │
├────────────────────────────────────┤
│ AT-RISK MEMBERS    [Win back all]  │
│ ● 7+ 8  ● 14+ 5  ● 30+ 3           │
│ Ravi K. 9d  [Message]             │
│         View all 16 ▸             │
├────────────────────────────────────┤
│ AUTOMATION  248 sent · 94% ✓       │
├────────────────────────────────────┤
│ PLAN: Pro · renews 5 Jul           │
│ WhatsApp ▓▓▓▓▓▓▓▓░░ 2,460/3,000     │
│ ⚡ 82% used → Premium?             │
├────────────────────────────────────┤
│ RENEWALS DUE (7d) 7 · ₹10,500      │
│ Today 2 [Remind] · Tmrw 1 [Remind] │
├────────────────────────────────────┤
│ Recent activity ▸  (collapsed)     │
└────────────────────────────────────┘
┌────────────────────────────────────┐
│ [💳 Collect][＋ Add][🔔 Remind][＋] │  ← sticky bottom bar
└────────────────────────────────────┘
```

---

## Appendix A — How the dashboard answers the owner's 10 morning questions

| Owner's question | Answered by |
|---|---|
| 1. What happened today? | **Today's Snapshot** (§3) |
| 2. What needs my attention? | **Action Center** (§4) |
| 3. How much money is coming in? | **Money** (§5) + **Upcoming Revenue** (§10) |
| 4. How many members are active? | **Membership Health** (§6) + Active KPI |
| 5. Who is about to expire? | **Upcoming Revenue** (§10) + Expiring KPI |
| 6. Who has not paid? | **Action Center** P0/P1 + **Money** outstanding (§4/§5) |
| 7. Who is becoming inactive? | **Ghost Member Intelligence** (§8) |
| 8. Is the gym growing or declining? | **Membership Health** growth + **Attendance** rate (§6/§7) |
| 9. Is Gymmobius automation working? | **Automation Intelligence** (§9) |
| 10. Anything I should do right now? | **Action Center** — top item, solid button (§4) |

## Appendix B — Design system tokens (match existing Gymmobius)

| Token | Value |
|---|---|
| Card | `bg-white rounded-xl border border-gray-200 p-5/p-6` |
| Page | `max-w-[1200px] mx-auto space-y-6` |
| Brand primary | indigo-600 / violet-600 (purple); brand gradient `from-violet-600 to-blue-500` |
| Semantic — success/paid | green-600 / green-50 |
| Semantic — warning/expiring | amber-600 / amber-50 |
| Semantic — urgent/overdue | red-600 / red-50 |
| Semantic — attendance | blue-600 / blue-50 |
| Semantic — members | indigo-600 / indigo-50 |
| Value type | `text-3xl font-bold text-gray-900 tracking-tight` |
| Label type | `text-sm text-gray-500` / micro `text-[11px] uppercase tracking-wide` |
| Icons | lucide-react, `strokeWidth 1.8`, 18–22px |
| Charts | recharts (lazy) — used **only** for the attendance sparkline |
| Skeleton | existing `Sk` component |

---

## Appendix C — Phased build recommendation (so this ships, not stalls)

| Phase | Scope | Why first |
|---|---|---|
| **P1 — Triage core** | `get_owner_dashboard` RPC · Alert Strip · **Action Center** · Today's Snapshot · Money · re-ranked Quick Actions (sticky mobile bar) | Delivers 80% of the decision value; the Action Center alone justifies the redesign |
| **P2 — Health + retention** | Membership Health · Attendance Health · **Ghost Intelligence** · Upcoming Revenue | Adds the "growing or declining?" + retention layer |
| **P3 — ROI + monetization** | Automation Intelligence · Subscription Usage quota meters + upgrade nudge · reminder→payment attribution (flagged) | Proves value, drives upgrades; heaviest queries land last |
| **P4 — Polish** | dismiss/snooze persistence · volatile-counter polling · pull-to-refresh · empty/celebration states | Refinements that need real usage data to tune |

> Ship P1 behind a feature flag to a few founder gyms, measure load time against the <2s budget on a mid-range Android over 4G, then roll forward.
```
