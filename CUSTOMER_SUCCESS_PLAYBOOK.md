# Gymmobius — Customer Success Playbook

**For:** Sales, demos, onboarding, customer support, founder reference, and staff training.
**Audience:** Non-technical. No coding knowledge needed to read this.
**Last updated:** 2026-06-10

---

## How to read this document

Every feature in this playbook is labelled so you never accidentally promise something that doesn't exist yet:

- **LIVE** — works today, in the product right now.
- **BETA** — partially built; the plumbing exists but it isn't fully switched on.
- **PLANNED — NOT YET IMPLEMENTED** — written about in our strategy or architecture documents, but not in the product. **Never sell this as available.**

If a customer asks for something and you can't find it labelled **LIVE** in here, the safe answer is: *"That's on our roadmap — let me confirm the timeline for you,"* not *"Yes, we have that."*

---

# 1. What is Gymmobius?

## What Gymmobius does

Gymmobius is an all-in-one software platform that runs the day-to-day business side of a gym. In plain terms, it replaces the register book, the WhatsApp-by-hand reminders, the payment-chasing, and the "who's expiring this week?" guesswork with one simple dashboard.

A gym owner uses Gymmobius to:

- Keep a clean list of every member, their plan, and when it expires.
- Take attendance with a QR code at the door (no register, no app to install for members).
- Collect payments online (Razorpay or UPI) and track who still owes money.
- Automatically send WhatsApp and email reminders before a membership expires.
- Spot "ghost members" (people who stopped coming) and win them back.
- See revenue, attendance, and growth in clear charts.
- Get a ready-made, professional gym website without hiring a designer.
- Give trainers their own login to manage their assigned members and workout/diet plans.
- Give members a simple app to see their plan, pay, check in, and view workouts.

## Who it is built for

- **Solo studios and neighborhood gyms** in India — the owner who is currently running everything on a register and personal WhatsApp.
- **Growing gyms** with a few trainers and multiple membership tiers.
- **Multi-branch gym chains** that need consolidated reporting across locations.

It is designed **for Indian gyms specifically** — pricing in rupees, Razorpay payment links, UPI support, and WhatsApp-first reminders (because that's where Indian members actually are).

## Problems it solves

| The pain today | How Gymmobius fixes it |
|---|---|
| Members tracked in a register or Excel — easy to lose, hard to search | One searchable member list with plan + expiry on every record |
| Owner manually WhatsApps each member to renew | Automatic WhatsApp reminders 3 / 1 / 0 days before expiry |
| Memberships quietly expire and the member is gone | Expiry alerts + a dashboard showing everyone expiring soon |
| Members stop showing up and nobody notices | Ghost-member detection nudges lapsed members at 5 / 14 / 30 days |
| Chasing cash payments | Razorpay + UPI online collection with a clean payment ledger |
| No idea how the business is actually doing | Revenue, attendance, and retention charts |
| Paying a designer for a website | A premium gym website generated automatically |

## Why a gym should use it

It saves the owner hours every week, stops revenue leaking out through forgotten renewals, and makes a small gym look professional to its members — all for less than what they pay their accountant.

---

# 2. Plans & Pricing

> **Important pricing facts (verified in the product):**
> - All prices are **per month**. **Annual / yearly billing is PLANNED — NOT YET IMPLEMENTED.** Do not quote annual prices.
> - Prices are shown **as-is**. There is **no separate GST line** in the product today (the company is not GST-registered yet), so the displayed price is the price.
> - Founder pricing is **50% off for the first 25 gyms, locked for 6 months** (see below).

## The plans

| Plan | Price / month | Best for |
|---|---|---|
| **Solo Coach** (Free) | ₹0 | Single trainer, no facility — or what a gym falls back to after the trial if they don't pay |
| **Starter** | ₹799 | Solo studios and neighborhood gyms, one location |
| **Pro** | ₹1,799 | Growing gyms with trainers and multiple plan tiers |
| **Premium** | ₹4,999 | Multi-branch chains and premium brands |

> Note: **Solo Coach** is mainly the *free fallback tier a trial converts into if the owner doesn't subscribe*. The three plans we actively sell are **Starter, Pro, and Premium**.

## What's included in each plan

| Feature | Solo Coach (Free) | Starter ₹799 | Pro ₹1,799 | Premium ₹4,999 |
|---|---|---|---|---|
| Active members | 25 | 150 | 750 | Unlimited |
| Trainer accounts | 0 (owner only) | 2 | 10 | Unlimited |
| WhatsApp reminders / month | 0* | 500 | 3,000 | 15,000 |
| Email reminders | Yes (fallback) | Yes | Yes | Yes |
| QR + manual attendance | Yes | Yes | Yes | Yes |
| Razorpay + UPI payment collection | Yes | Yes | Yes | Yes |
| Gym website | Single-page | Multi-page | Multi-page | Multi-page |
| Website URL | gymmobius.com/your-gym | gymmobius.com/your-gym | + custom subdomain | + custom domain |
| Advanced analytics (churn, peak hours, cohorts) | No | No | Yes | Yes |
| Analytics date range | 30 days | 30 days | 90 days / 1 year | 90 days / 1 year |
| Ghost-member detection | Yes | Yes | Yes | Yes |
| SEO meta overrides | No | No | Yes | Yes |
| Multi-branch operations | No | No | No | Yes |
| Support | Email | Email · 1 business day | Same business day | 4-hour target · phone + WhatsApp |

\* *Solo Coach has 0 WhatsApp messages after the trial — all its reminders go by email instead. During the 30-day trial, a free account gets **50 WhatsApp messages total** to try the feature.*

## Plan limits at a glance

| Limit | Solo Coach | Starter | Pro | Premium |
|---|---|---|---|---|
| Members | 25 | 150 | 750 | Unlimited |
| Trainers | 0 | 2 | 10 | Unlimited |
| WhatsApp / month | 0 | 500 | 3,000 | 15,000 |
| Branches | 1 | 1 | 1 | Unlimited |
| Email / month | No hard limit | No hard limit | No hard limit | No hard limit |

- "Active members" = members who haven't been deleted, regardless of whether they've paid. A lapsed-but-not-deleted member still counts.
- Trainer count includes both claimed trainer accounts and pending (unclaimed) trainer invites.

## Founder pricing (LIVE)

- The **first 25 gyms** to subscribe get **50% off** their chosen plan.
- The discount is **locked in for 6 months**.
- After the 25th slot is claimed, founder pricing closes automatically and standard pricing applies.

Founder monthly prices (50% off):

| Plan | Standard | Founder (first 25) |
|---|---|---|
| Starter | ₹799 | ₹400 |
| Pro | ₹1,799 | ₹900 |
| Premium | ₹4,999 | ₹2,500 |

> Older strategy notes mention "first 100 customers, 24 months." That was revised. **The product enforces 25 slots and 6 months.** Always quote 25 / 6 months.

## Who should choose what

- **Solo Coach (Free):** A home-based personal trainer with a handful of clients and no budget — or someone who wants to keep using a stripped-down version after their trial.
- **Starter:** A single-location gym with up to ~150 members who wants WhatsApp reminders and a website.
- **Pro:** A gym that has trainers, wants ghost-detection and deeper analytics, and wants its own branded web address (a subdomain).
- **Premium:** A chain with multiple branches, or a premium brand that wants its own domain (yourbrand.com) and the highest WhatsApp volume.

---

# 3. The 30-Day Trial

## What the trial includes (LIVE)

- **30 days, no credit card required.**
- During the trial, the account can add up to **150 members** and **2 trainers** (the same limits as Starter) so the owner can do a real evaluation.
- **50 WhatsApp messages total** for the whole trial (not per month) so they can experience the reminder feature.
- Full access to the dashboard, website builder, attendance, payments, and analytics.

## What happens during the trial

- The owner sees a countdown of how many days are left in the dashboard.
- They can add their real members, set up their website, send reminders, and collect payments.
- The goal is for them to see one full renewal cycle: a member's expiry approaching, the WhatsApp reminder going out, and the member paying.

## What happens when the trial ends

- After 30 days, if the owner has **not** subscribed to a paid plan, the account automatically becomes a **Solo Coach (Free)** account.
- **No data is deleted.** Members, payments, attendance, and website all stay.

## What data is preserved

**Everything.** Members, plans, payment history, attendance records, website content, and trainer accounts all remain in the account. Nothing is erased when a trial ends.

## What stops working when the trial ends (drops to Solo Coach Free)

- **Member limit drops from 150 to 25** — they can't *add* new members beyond 25, but existing members are not deleted.
- **Trainers drop to 0** — trainer accounts can no longer be added (existing trainer logins are restricted).
- **WhatsApp reminders stop** — Solo Coach has 0 WhatsApp messages. Reminders fall back to **email only**.
- Website drops to **single-page**.
- Advanced analytics and other Pro/Premium features are locked.

> **There is currently no "your trial ends tomorrow" email.** The countdown only shows inside the dashboard. (Trial-ending email reminders are **PLANNED — NOT YET IMPLEMENTED.**)

## The upgrade process

The owner goes to **Subscription** in their dashboard, picks Starter / Pro / Premium, and pays via Razorpay. Access to the full plan is unlocked immediately after payment. If founder slots are still open, the 50% discount is applied automatically.

---

# 4. Member Management

## Add a member (LIVE)

The owner clicks **Add Member** and enters **name, phone, and email**. A new member starts with status **inactive** (no plan yet). The owner can then assign a plan, which activates them.

- The system blocks duplicate phone numbers or emails within the same gym.
- If a previously-deleted member is re-added with the same phone/email, their old record is revived instead of creating a duplicate.
- Optionally, the owner can tick **"Send invite"** so the member gets an email to set up their own login.

## Edit a member (LIVE)

The owner can update name, phone, and email at any time. They can also record **health metrics** (height, weight, age, sex) which power the BMI / BMR / calorie calculators in the member app. Health changes are kept as a history.

## Membership renewals (LIVE)

When a plan is assigned or renewed, expiry is calculated intelligently ("anchor-with-grace"):

- **New member:** plan starts today.
- **Renewing early (still has days left):** the new period **stacks on top** of unused days. A 30-day plan with 10 days remaining becomes 40 days, not 30 — the member never loses paid days.
- **Renewing a little late** (within one plan length of expiry): the new period is added onto the old expiry date, so the member pays for the gap (matches how Indian gyms actually bill).
- **Renewing very late** (gap longer than one plan length): treated as a fresh start from today.

The owner can also manually override the renewal date if needed.

## Membership expiry (LIVE)

- Each member has an **expiry date**. When today's date passes it, the member is treated as expired.
- The dashboard shows everyone **expiring within the next 5 days**.
- Automatic WhatsApp/email reminders go out **3 days before, 1 day before, and on the expiry day** (see Section 7).

## Membership statuses (LIVE)

| Status | Meaning |
|---|---|
| **Inactive** | Member exists but has no active plan assigned |
| **Active** | Has a plan and the expiry date is in the future |
| **Expired** | Plan's expiry date has passed |
| **Deleted** | Soft-deleted — hidden from lists but recoverable; does not count toward the member limit |

## Member profile (LIVE)

Each member record holds: name, phone, email, assigned plan, join date, expiry date, status, assigned trainer, branch (for multi-branch gyms), health metrics, attendance history, and payment history.

## Member registration flow (LIVE — Self-Registration)

Instead of the owner typing in every member by hand, a gym can share a public registration link: **gymmobius.com/your-gym/register** (also reachable from the QR code's "New here? Request to join" link).

1. A prospective member fills in their name, phone, email (and optional notes).
2. The request lands in a **pending queue** on the owner's Members page (an amber card). It does **not** consume a member slot yet.
3. The owner reviews and clicks **Approve** (or Reject). On approval, the member is created and an invite email is sent.

This is **owner-approval-by-default** — nothing is auto-added.

> The owner is notified of new registrations via the **dashboard queue**, not email. (The email notification for registration requests was removed because owners check the dashboard directly.)

## Limits

- Member limit per plan (25 / 150 / 750 / unlimited).
- Pending self-registration requests do **not** count against the limit until approved.

## Manual actions available

- Add, edit, delete, and revive members.
- Assign / change / renew plans.
- Record payments and mark them paid.
- Approve or reject self-registration requests.
- Send a member invite email.
- Assign a member to a trainer.
- Mark a manual check-in.

## Automated actions available

- Expiry reminders (WhatsApp/email) at 3 / 1 / 0 days.
- Ghost-member nudges at 5 / 14 / 30 days of no attendance.
- Welcome message after first successful payment.
- Payment confirmation receipt after a payment is marked paid.

---

# 5. Attendance System

## Manual attendance (LIVE)

On the **Attendance** page the owner clicks **"+ Mark Check-in,"** picks a member from a dropdown, and records their check-in. Useful for members without a phone handy, or walk-up situations.

## QR check-in (LIVE)

- Each gym has **one QR code** (not per member). The owner downloads a ready-made **printable banner** (a 600×820 poster with the gym's logo, name, the QR, and step-by-step instructions) and displays it at the entrance or reception.
- A member opens their **phone camera**, points at the QR, taps the link, and checks in. **No app to install.**
- The first time, the member signs in once; after that every scan is a single tap (the session is remembered).
- A **1-hour cooldown** prevents accidental double check-ins.

## Member self check-in (LIVE)

The QR link is the self check-in. Members can also bookmark the check-in link (the owner can share it over WhatsApp) and tap it to check in anytime they're at the gym.

## Trainer check-in (clarification)

There is **no separate "trainer marks attendance" screen**. Trainers can **view** their assigned members' attendance history (read-only). The two ways attendance gets recorded are: the **member scanning the QR**, or the **owner marking a manual check-in**.

## Attendance reports (LIVE)

- A live list of today's check-ins (with time), searchable, paginated.
- A **date picker** to view any past day.
- A **7-day bar chart** of daily check-in counts (click a bar to jump to that day).
- Each check-in updates the member's "last seen" date, which feeds ghost-detection.

## What happens after a check-in

- The check-in is recorded instantly and appears on the owner's Attendance page in real time.
- The member's "last check-in" timestamp updates (this resets their ghost-member clock).
- The member sees a "You're Checked In!" confirmation.

## Limitations

- The QR is **gym-wide**, not unique per member. (Per-member QR codes are **PLANNED — NOT YET IMPLEMENTED.**)
- A member must be **signed in** to check in (the lock screen sends new prospects to the registration form).
- 1-hour cooldown between check-ins.
- No hardware turnstile / biometric integration.

## Common questions

- *"Do members need to download an app?"* — No. Any phone camera works.
- *"Can a member check in twice to fake attendance?"* — No, the 1-hour cooldown blocks it.
- *"What if a member forgot their phone?"* — The owner marks a manual check-in.
- *"Can I print the QR?"* — Yes, download the banner from the Attendance page and print it.

---

# 6. Payments & Memberships

## How a gym collects money (LIVE)

Each gym chooses a **payment mode** in settings: **Razorpay** or **UPI**.

### Razorpay (online card/UPI/netbanking)

- Each gym connects **its own Razorpay account** (their keys are stored securely). Money goes directly to the gym.
- **Checkout** — the owner can take a payment right from the dashboard.
- **Payment links** — sent automatically inside WhatsApp reminders so the member can pay in one tap.
- A **webhook** confirms the payment automatically and marks it paid.

### UPI (manual confirmation)

- The member gets a UPI link, pays via GPay / PhonePe / Paytm, then taps **"I Paid."**
- The payment goes into a **"verification pending"** state, and the owner confirms it. A badge on the Payments nav shows how many are waiting.

### Manual / cash

- The owner can record a payment as paid manually (e.g. cash collected at the desk).

## Payment tracking (LIVE)

- All payments live in one ledger with member, plan, amount, status, source, and date.
- Statuses: **pending**, **paid**, **verification pending** (UPI "I paid", awaiting owner), **expired** (a stale pending that was superseded).
- The owner sees recent payments and revenue on the dashboard.

## Pending payments (LIVE)

- A dedicated view of who hasn't paid.
- Each pending payment has a **"Remind"** button that sends a WhatsApp/email payment reminder on the spot.
- A "last reminded 2h ago" indicator prevents over-messaging.

## Renewals (LIVE)

When a payment is marked paid against a plan, the member's membership is automatically extended using the same stacking logic described in Section 4, and a **payment confirmation receipt** is sent.

## Membership plans (LIVE)

The owner creates the gym's own membership plans (e.g. "Monthly," "Quarterly," "Annual") with a **name, price, and duration in days**. These are separate from the Gymmobius subscription plans — these are what the gym sells to *its* members.

## Manual actions

- Record a payment (paid or pending).
- Mark a pending payment as paid (cash/UPI).
- Confirm a "verification pending" UPI payment.
- Send a payment reminder manually.
- Delete a non-paid payment (only manual/UPI/link sources; Razorpay-captured rows can't be deleted).

## Automated actions

- Payment reminders at 3 / 1 / 0 days before expiry.
- Razorpay payment auto-confirmation via webhook.
- Automatic membership extension on payment.
- Welcome message after first payment.
- Payment confirmation receipt email.

---

# 7. WhatsApp Notifications

WhatsApp is the **primary channel** for member-facing reminders. They're sent through **Interakt** (a WhatsApp Business provider). **Every WhatsApp message automatically falls back to email** if WhatsApp can't be sent (quota used up, Solo Coach plan, provider error, or no phone number).

> **Plan eligibility rule:** WhatsApp requires a paid plan's monthly quota (Starter 500 / Pro 3,000 / Premium 15,000). **Solo Coach (post-trial) has 0 WhatsApp**, so all its reminders go by email. During the 30-day trial a free account has **50 WhatsApp messages total.**

> **WhatsApp templates must be approved by Meta** through Interakt before they send. This is a one-time setup per gym/account.

## Full WhatsApp message table (LIVE)

| Message | Trigger | Recipient | Timing | Auto / Manual | Plan eligibility | Purpose |
|---|---|---|---|---|---|---|
| **Payment Reminder** (friendly) | Membership renews in 3 days | Member | **3 days before expiry**, daily cron ~09:00 IST | Automatic (also Manual via Remind) | Starter+ (email on Solo Coach) | Gentle heads-up to renew |
| **Payment Reminder** (medium) | Renews in 1–2 days | Member | **1 day before expiry** | Automatic + Manual | Starter+ | Clearer nudge with deadline |
| **Payment Reminder** (urgent) | Expires today / overdue | Member | **On expiry day (0)** | Automatic + Manual | Starter+ | "Renew now" last call |
| **Member Welcome** | Member's first successful payment | Member | Immediately after first payment | Automatic | Starter+ (email fallback) | Welcome + how to use the portal |
| **Ghost Member Recall** ("we miss you") | No check-in for a while | Member | **Day 5, day 14, day 30** of inactivity, daily cron ~10:00 IST | Automatic | Starter+ (email fallback) | Win back lapsed members |
| **Subscription Expiry Reminder** (SaaS) | The *gym owner's* Gymmobius subscription is expiring | Gym owner | **7, 3, 1, and 0 days** before subscription expiry, ~09:00 IST | Automatic | All paid | Remind owner to renew Gymmobius |
| **Weekly Summary** | Weekly digest | Gym owner | **Every Sunday 18:00 IST** | Automatic (if enabled) | All (owner picks WhatsApp/email/both) | Pending payments, expiring members, weekly revenue |

### Notes on timing

- Payment reminders fire at **−3 / −1 / 0 days** relative to the member's expiry date. Each of the three uses different wording so the member doesn't get the same text three times.
- Ghost recall fires at **5 / 14 / 30 days** of no check-in, then **goes silent** after 30 days (so the gym's WhatsApp number isn't flagged as spam). Maximum 3 nudges per absence.
- SaaS (owner subscription) reminders fire at **7 / 3 / 1 / 0 days**.

### Messages that are **email-only** (never WhatsApp today)

These go by email even though everything else prefers WhatsApp:

- **Payment confirmation receipt** (to member, after a payment is paid)
- **Subscription payment receipt** (to owner, after they pay for Gymmobius)
- **Member invite** (to member, "you've been added, set up your account")
- **Trainer invite** (to trainer, "claim your account")

### Staged / not active

- **Membership Expiry Reminder** (a standalone "your membership ends in N days" with no payment link) — the template exists but the daily reminders currently use the payment-reminder messages instead. **BETA — staged for future use.**
- **Daily Summary** — there is **no daily summary**. It was replaced by the **Weekly Summary** (Sundays). If someone references a "daily summary," correct them: it's weekly now.

---

# 8. Email Notifications

Email is both a **primary channel** (for receipts and invites) and the **automatic fallback** for every WhatsApp message. Emails are sent through **Resend**, branded with the gym's logo and color for member-facing mail.

## Full email table (LIVE)

| Email | Trigger | Recipient | Timing | Auto / Manual | Purpose |
|---|---|---|---|---|---|
| **Payment Confirmation** | A payment is marked paid | Member | Immediately | Automatic | Receipt: plan, amount, valid-until date |
| **Welcome** | First successful payment | Member | Immediately | Automatic (fallback for WhatsApp, or primary on Solo Coach) | Welcome the member |
| **Payment Reminder** | WhatsApp reminder blocked/failed | Member | Same 3/1/0 schedule | Automatic fallback | Renew membership |
| **Ghost Reminder** | WhatsApp recall blocked/failed | Member | 5/14/30 days | Automatic fallback | "We've missed you" |
| **Member Invite** | Owner adds member with invite, or approves a self-registration | Member | Immediately | Manual/Automatic | Set up member login |
| **Trainer Invite** | Owner invites a trainer | Trainer | Immediately | Manual | Claim trainer account |
| **Subscription Payment Receipt** | Owner pays for Gymmobius | Gym owner | Immediately | Automatic | Receipt for the gym's subscription |
| **Subscription Expiry Alert** | Owner's subscription expiring (WhatsApp fallback) | Gym owner | 7/3/1/0 days | Automatic fallback | Renew Gymmobius |
| **Weekly Summary** | Weekly digest | Gym owner | Sundays 18:00 IST | Automatic (if owner picks email) | Richer digest: revenue trend, overdue/at-risk/expiring lists |
| **Find My Gym** | Member/trainer uses the "find my gym" lookup | Member/Trainer | On lookup match | Automatic | Sends the correct gym portal link |

## Email controls (LIVE)

- A member can be marked **unsubscribed** — they then get no emails.
- A gym can turn the **email channel off** entirely.
- If both WhatsApp and email are off/blocked, the message is logged as **skipped** (visible in the Communication page activity log) — nothing is silently lost.

---

# 9. Reports & Analytics

## Dashboard metrics (LIVE)

The owner's home dashboard shows live KPIs:

- **Total members**
- **Active members**
- **Expiring soon** (within the next 5 days)
- **Total revenue**
- **Today's check-ins**
- **Trainer count**
- A **recent activity** feed (new members, payments received, check-ins).

## Available reports (LIVE)

| Report | What it shows | Plan |
|---|---|---|
| Revenue by month | Income trend over the last 6 months | All |
| Member growth | New members per month | All |
| Attendance over time | Check-ins per month and a 7-day chart | All |
| Member status breakdown | Active vs expired vs inactive | All |
| **CSV export** | Revenue-by-month exported as a spreadsheet file | All |
| **Advanced analytics** | Peak hours, churn, cohort retention, deeper breakdowns | **Pro & Premium** |
| Date range | How far back you can look | Starter = 30 days; Pro/Premium = 90 days / 1 year |

## Revenue reporting (LIVE)

Revenue is summed from **paid** payments, broken down by month, and shown on both the dashboard and the Analytics page. It can be exported to CSV.

## Attendance reporting (LIVE)

Daily check-in counts, a 7-day chart, any-day lookup, and monthly attendance trends.

## Member reporting (LIVE)

Total/active/expiring counts, status breakdown, and growth over time. Advanced retention/churn views are Pro+.

> **Data export note:** Today the only export is the **revenue-by-month CSV** on the Analytics page. A full member-list or full-payments CSV export is **PLANNED — NOT YET IMPLEMENTED.**

---

# 10. Trainer Management

## Add a trainer (LIVE)

The owner goes to **Trainers** and invites a trainer by **name, phone, email**. The trainer gets an email to **claim their account**. (Trainer invites are email-based.)

- Trainer limit: Solo Coach 0, Starter 2, Pro 10, Premium unlimited.
- Both claimed trainers and pending (unclaimed) invites count toward the limit.

## Permissions — what trainers CAN see and do (LIVE)

- Log into their **own trainer dashboard**.
- See **only the members assigned to them** (not the whole gym roster).
- View their assigned members' **attendance history**.
- Create and assign **workout and diet plans** (from the gym's templates) to their members.
- View/update member **health metrics** and use the fitness calculator tools.
- See basic stats for their assigned members (total, active today, plans assigned).

## What trainers CANNOT do (LIVE)

- **Cannot see payments or revenue.**
- **Cannot see members who aren't assigned to them.**
- **Cannot manage the gym subscription or billing.**
- **Cannot change gym settings or the website.**
- **Cannot add/remove other trainers or members.**

## Roles available

Only **Owner, Trainer, and Member** roles exist. **Manager / receptionist / front-desk staff roles are PLANNED — NOT YET IMPLEMENTED.**

---

# 11. Website Builder

Every gym gets a **professional website generated automatically** — it always looks complete, even before the owner adds any content (it uses sensible fallback content).

## What gym websites include (LIVE)

- **Sections:** Hero, About, Programs, Trainers, Testimonials, Why-Us, Gallery, Call-to-Action, Footer.
- **Branding:** the gym's logo, primary & secondary colors, fonts, light/dark theme, card style, corner radius, spacing, shadow intensity, and hero style.
- **Content management (CMS):** edit text, and add/edit/remove trainers, testimonials, programs, membership plans, and gallery images.
- **Image uploads** with per-plan limits (more images allowed on higher plans).
- **Contact details, working hours, social links, and a map location.**
- **Legal pages:** terms, privacy, refund, membership, and waiver pages.

## Editing features by plan

| Capability | Solo Coach | Starter | Pro | Premium |
|---|---|---|---|---|
| Edit hero + show/hide sections | Yes | Yes | Yes | Yes |
| Number of pages | Single-page | Multi-page | Multi-page | Multi-page |
| Edit all headings, live preview, font controls | No | No | Yes | Yes |
| Advanced design (radius/spacing/shadow), section reorder, page hero images | No | No | No | Yes |

## Registration forms (LIVE)

The public site includes a **member registration form** at `your-gym/register`. Submissions go to the owner's approval queue (Section 4).

## Public pages (LIVE)

Home, About, Trainers, Pricing, Contact, plus the legal pages. Members can also browse and join via a public checkout.

## SEO features (LIVE)

- Search-engine friendly: structured data (JSON-LD), automatic sitemap and robots files, and pre-rendered pages so Google can read them.
- **Custom SEO overrides** (meta description, social share image, keywords) — **Pro & Premium**.

## Domain & subdomain support

| URL type | Example | Plan |
|---|---|---|
| Path URL | gymmobius.com/iron-paradise | All plans (default) |
| Custom **subdomain** | iron-paradise.gymmobius.com | **Pro & Premium** |
| Custom **apex domain** | ironparadise.com | **Premium only** |

The owner can change their URL slug at any time, and old links keep redirecting automatically.

> **Drag-and-drop builder and AI-generated content are PLANNED — NOT YET IMPLEMENTED.**

---

# 12. Multi-Branch

**Multi-branch is a Premium-only feature (LIVE).**

## How branches work

- A Premium gym can create multiple **branches** (locations).
- A **branch switcher** lets the owner view one branch at a time, or all branches together.
- Members, trainers, payments, and attendance can each be tied to a branch.
- **Consolidated reporting** rolls everything up across all branches.

## Limits

- **Branches are available only on Premium.** Starter and Pro are single-branch.
- Premium allows **unlimited** branches.

## Permissions

- Branch separation is handled at the **app level** — the owner sees branch-filtered views.
- There is **no separate "branch manager" login.** Branch-level staff roles are **PLANNED — NOT YET IMPLEMENTED.**

## Reporting

- Per-branch views (filter to one branch) and an all-branches consolidated view.

> **Not yet available for multi-branch:** moving a member from one branch to another through the UI (needs manual help today), a separate per-branch public website, and branch-specific domains. All **PLANNED — NOT YET IMPLEMENTED.**

---

# 13. Support FAQ (100+ Q&A)

### Members & registration

1. **How do I add a member?** Click *Add Member*, enter name, phone, and email, then assign a plan.
2. **How do I renew a member?** Open the member, assign/renew their plan or mark their pending payment as paid — the membership extends automatically.
3. **Do renewals lose the member's remaining days?** No. Early renewals stack on top of unused days.
4. **What happens if a member renews late?** If it's within one plan length of expiry, they pay from the old expiry date; if it's much later, it starts fresh from today.
5. **Can members register themselves?** Yes — share `your-gym/register`. Requests go to your approval queue.
6. **Does a registration request use up a member slot?** No, only approving it does.
7. **How do I approve a self-registration?** On the Members page, an amber card lists pending requests — click Approve.
8. **Can I reject a registration?** Yes. (A rejection email to the member is planned but not yet sent automatically.)
9. **What if two people register with the same phone?** The system blocks the duplicate.
10. **Can I edit a member's details later?** Yes — name, phone, email, and health metrics.
11. **What are the member statuses?** Inactive (no plan), Active (plan valid), Expired (plan lapsed), Deleted (hidden, recoverable).
12. **If I delete a member, are they gone forever?** No — it's a soft delete. Re-adding the same phone/email revives them.
13. **Do deleted members count toward my limit?** No.
14. **Do expired (but not deleted) members count toward my limit?** Yes — "active" means "not deleted," regardless of payment.
15. **How many members can I have?** Solo Coach 25, Starter 150, Pro 750, Premium unlimited.
16. **What happens when I hit my member limit?** You're prompted to upgrade; existing members are untouched.
17. **Can I assign a member to a trainer?** Yes, from the member's record.
18. **Can a member belong to more than one gym?** Yes, rarely — different gyms are fully separate.
19. **Can I store a member's height/weight?** Yes, plus age and sex — they power the fitness calculators.
20. **Is member health history kept?** Yes, changes are tracked over time.

### Attendance

21. **Can members check in themselves?** Yes, by scanning the gym QR with their phone camera.
22. **Do members need an app to check in?** No — any phone camera works.
23. **Is the QR unique per member?** No, it's one QR for the whole gym. (Per-member QR is planned.)
24. **Where do I get the QR?** Download the printable banner from the Attendance page.
25. **Can I mark attendance manually?** Yes — *+ Mark Check-in* and pick the member.
26. **Can a member check in twice quickly?** No — there's a 1-hour cooldown.
27. **Can trainers mark attendance?** Trainers view attendance (read-only); recording is done by the member (QR) or owner (manual).
28. **Can I see past days' attendance?** Yes, use the date picker.
29. **Can I see attendance trends?** Yes — a 7-day chart and monthly trends.
30. **Does a member need to be signed in to check in?** Yes; new prospects are sent to the registration form instead.
31. **What if a member forgot their phone?** Mark a manual check-in for them.
32. **Can I share the check-in link on WhatsApp?** Yes — members can bookmark and tap it.
33. **Does check-in work offline?** No, it needs an internet connection.

### Payments

34. **What payment methods are supported?** Razorpay (online) and UPI, plus manual/cash recording.
35. **Whose account does the money go to?** The gym's own Razorpay account — you connect your keys.
36. **How do online payment links work?** They're embedded in WhatsApp reminders; the member taps to pay.
37. **What is "verification pending"?** A UPI payment where the member tapped "I Paid" and you need to confirm it.
38. **How do I confirm a UPI payment?** Open Payments, find the pending-verification row, and mark it paid.
39. **Can I record a cash payment?** Yes — mark it paid manually.
40. **Can I send a payment reminder manually?** Yes — the *Remind* button on any pending payment.
41. **How do I see who hasn't paid?** The Payments page lists pending payments.
42. **Can I delete a payment?** Only non-paid manual/UPI/link payments. Razorpay-captured payments can't be deleted.
43. **Does marking a payment paid renew the member?** Yes, it extends their membership automatically.
44. **Does the member get a receipt?** Yes, a payment confirmation email.
45. **Can I create my own membership plans?** Yes — name, price, and duration in days.
46. **Are my membership plans the same as Gymmobius plans?** No — yours are what you sell to your members; Gymmobius plans are your subscription.
47. **What if a Razorpay payment fails?** The member can retry the link; nothing is marked paid until it succeeds.

### WhatsApp & Email reminders

48. **How do WhatsApp reminders work?** Automatically at 3, 1, and 0 days before a member's expiry.
49. **Can I send a reminder right now?** Yes — the Remind button.
50. **Why didn't my WhatsApp send?** Likely out of monthly quota, on Solo Coach (0 WhatsApp), or the WhatsApp template isn't approved yet — it then falls back to email.
51. **What's my WhatsApp limit?** Starter 500, Pro 3,000, Premium 15,000 per month.
52. **Does WhatsApp work on the free plan?** Solo Coach has 0 WhatsApp (email only). During the trial you get 50 messages total.
53. **What happens if I run out of WhatsApp messages?** Reminders switch to email until the next month.
54. **Do I need to set up WhatsApp templates?** Yes — they must be approved by Meta through Interakt (a one-time setup).
55. **What's the ghost-member reminder?** An automatic "we miss you" nudge at 5, 14, and 30 days of no check-in.
56. **Will ghost reminders annoy members forever?** No — it stops after 30 days (max 3 nudges).
57. **What's the weekly summary?** A Sunday digest to the owner: pending payments, expiring members, and weekly revenue.
58. **Is there a daily summary?** No — it's weekly now (Sundays 18:00 IST).
59. **Can I choose WhatsApp or email for the weekly summary?** Yes, in Communication settings.
60. **Will members get a welcome message?** Yes, after their first successful payment.
61. **Can a member opt out of emails?** Yes — they can be marked unsubscribed.
62. **Can I turn off all emails for my gym?** Yes, in settings.
63. **Are reminders in Tamil?** Not yet — currently English. (Tamil templates are planned.)
64. **Will I be reminded before my own subscription expires?** Yes — at 7, 3, 1, and 0 days.

### Trial & subscription

65. **How long is the trial?** 30 days, no card required.
66. **What can I do during the trial?** Up to 150 members, 2 trainers, 50 WhatsApp messages, and the full feature set.
67. **What happens when the trial ends?** If you don't subscribe, the account becomes Solo Coach (Free) — your data stays.
68. **Will I lose my data after the trial?** No, nothing is deleted.
69. **What stops working after the trial?** Member limit drops to 25, trainers to 0, WhatsApp to 0 (email reminders continue), website to single-page, advanced features lock.
70. **Will I get an email warning before my trial ends?** Not currently — the countdown shows in the dashboard. (Trial-end emails are planned.)
71. **How do I upgrade?** Subscription page → pick a plan → pay via Razorpay.
72. **What happens when my subscription expires?** You're blocked from adding members/trainers and sending reminders until you renew. Your data stays safe.
73. **Can I cancel my subscription?** There's no self-serve cancel button yet — contact support. (A cancel flow is planned.)
74. **Can I pause my membership during a slow season?** Not yet — pausing is planned.
75. **Is there annual billing?** Not yet — monthly only today. (Annual is planned.)
76. **Is GST added?** No separate GST line today; the displayed price is what you pay.

### Founder pricing

77. **What is founder pricing?** 50% off for the first 25 gyms to subscribe.
78. **How long does founder pricing last?** Locked for 6 months.
79. **How many founder slots are left?** Shown on the Subscription page; it stops once 25 are claimed.
80. **What are the founder prices?** Starter ₹400, Pro ₹900, Premium ₹2,500 per month.

### Plans, limits, upgrades

81. **What's the difference between Starter and Pro?** Pro adds more members/trainers/WhatsApp, ghost-detection-grade analytics, a custom subdomain, and SEO overrides.
82. **When should I get Premium?** When you have multiple branches or want your own domain and the highest WhatsApp volume.
83. **What's the member limit on each plan?** 25 / 150 / 750 / unlimited.
84. **What's the trainer limit?** 0 / 2 / 10 / unlimited.
85. **Can I downgrade?** Yes, but excess members/trainers above the new limit aren't deleted — you just can't add more.
86. **Will I be warned before hitting a limit?** You're blocked at 100% of the limit with an upgrade prompt. (An 80% early warning is planned.)

### Website & domains

87. **Do I get a website?** Yes, generated automatically with your branding.
88. **Can I edit the website content?** Yes — text, trainers, testimonials, programs, plans, gallery.
89. **Can I change my web address?** Yes, anytime — old links auto-redirect.
90. **Can I use my own domain?** A subdomain (yourgym.gymmobius.com) on Pro; your own domain (yourgym.com) on Premium.
91. **Is the website good for Google?** Yes — it has SEO basics built in; meta overrides are Pro+.
92. **Can members join from the website?** Yes, via the registration form / public checkout.

### Trainers

93. **How do I add a trainer?** Trainers page → invite by name/phone/email → they claim via email.
94. **Can trainers see payments?** No — trainers never see payments or revenue.
95. **Can trainers see all members?** No — only members assigned to them.
96. **What can trainers do?** View assigned members and their attendance, and assign workout/diet plans.
97. **Can I have front-desk/manager logins?** Not yet — only owner, trainer, member roles exist.

### Data, multi-branch, general

98. **Can I export my data?** Revenue-by-month CSV today; full member/payment export is planned.
99. **How do branches work?** Premium only — create locations, switch between them, and get consolidated reporting.
100. **Can I move a member between branches?** Not through the UI yet — contact support.
101. **Is my data private/separated from other gyms?** Yes — every gym's data is fully isolated.
102. **How do members log in?** Via the invite email link, then email/password (or Google).
103. **What's the member app?** A simple portal to see their plan, pay, check in, view workouts, and use fitness calculators.
104. **Is there a mobile app to install?** It's a web app/PWA — no app-store download required.
105. **What if a member is at the wrong gym's portal?** The "find my gym" lookup emails them the correct link.

---

# 14. Known Limitations

## Current limitations (LIVE product, things it does NOT do yet)

- **No annual/yearly billing** — monthly only.
- **No self-serve subscription cancellation** — handled by support.
- **No membership pause/freeze** for slow seasons.
- **No "trial ends tomorrow" email** — only an in-dashboard countdown.
- **No 80%-of-quota early warning** — you're blocked at 100%.
- **No full data export** — only revenue-by-month CSV.
- **QR is gym-wide, not per member.**
- **WhatsApp/email templates are English-only** (no Tamil yet).
- **No manager/receptionist roles** — only owner, trainer, member.
- **Multi-branch:** no branch-manager login, no UI member transfers between branches, no per-branch website.
- **Trainers cannot see payments** (by design).
- **Self-registration** has no spam captcha or rate-limiting yet, and no branch picker on the public form.
- **Some website design features are enforced only in the interface** (a technically-skilled user could bypass them) — not a real-world concern at current scale.
- **API access** is listed as a Premium benefit but is **not built yet**.

## Planned improvements / under development (PLANNED — NOT YET IMPLEMENTED)

- Annual billing and a subscription cancel/pause flow.
- Trial-ending and 80%-quota warning emails.
- Tamil WhatsApp/email templates.
- Per-member QR codes.
- Full member/payment CSV export.
- Manager/receptionist staff roles.
- Multi-branch member transfers, per-branch websites, branch-specific domains.
- Self-registration spam protection (captcha + rate limit), branch picker, auto-approve toggle, rejection emails.
- Drag-and-drop website builder and AI-generated content.
- Premium API access and "bring your own WhatsApp provider."
- WhatsApp "Pay Now" buttons on reminders.

---

# 15. Support Troubleshooting

### "My WhatsApp reminders aren't being delivered."

1. Check the plan — Solo Coach has **0 WhatsApp** (it uses email). Trial has **50 total**.
2. Check the monthly quota — if used up, it falls back to email until next month.
3. Confirm the **WhatsApp templates are approved** in Interakt (Meta approval is required).
4. Confirm the member has a valid phone number on their record.
5. Look at the Communication activity log — a "skipped" entry tells you why.

### "A member paid but their membership didn't extend."

1. Confirm the payment shows **paid** (not pending/verification-pending).
2. For UPI "I Paid," the owner must **confirm** it first.
3. If it's paid but expiry didn't move, re-open the member and re-assign the plan — extension will recompute.

### "A UPI payment is stuck."

It's in **verification pending** — the member tapped "I Paid" and you need to confirm it on the Payments page.

### "I can't add a new member."

1. You may have hit your **member limit** (25/150/750) — upgrade or remove deleted records.
2. Your **subscription may have expired** — renew to unlock adding members.

### "A member can't log in."

1. Confirm an **invite email** was sent (resend from the member's record).
2. If the member was recently deleted and re-added, their login is re-activated on revival — ask them to use the email link again.
3. They may be at the wrong gym's portal — use **find my gym**.

### "The QR check-in says 'Wrong Gym' or 'Members Only.'"

- "Wrong Gym" = the member belongs to a different gym.
- "Members Only" = they're logged in as an owner/trainer, not a member.

### "A member checked in but it says 'Already Checked In.'"

That's the **1-hour cooldown** — normal anti-double-tap protection.

### "My trial ended and features disappeared."

The account dropped to **Solo Coach (Free)** — data is safe; subscribe to restore full limits.

### "The owner's dashboard shows a red 'subscription expired' banner."

Renew the subscription. Members, trainers, reminders, and new additions are blocked until renewal, but **no data is lost**.

### "Self-registrations aren't showing up."

Check the **amber pending card** on the Members page (owners are notified in-dashboard, not by email).

---

# 16. Sales Objection Handling

### "It's too expensive."

*"Starter is ₹799 a month — less than what you pay your accountant, and far less than the cost of even one or two members who quietly let their membership lapse because nobody reminded them. The WhatsApp reminders alone usually pay for the software several times over. And right now we have founder pricing — 50% off, locked for 6 months — for the first 25 gyms."*

### "I use Excel."

*"Excel is great until you need to remember who's expiring this week, send 40 reminders by hand, and figure out who actually paid. Gymmobius does all of that automatically and sends the WhatsApp reminders for you. Excel can't text your members — and that's exactly what brings the renewals in."*

### "I already use WhatsApp."

*"Perfect — your members already expect WhatsApp from you. The difference is doing it by hand for every member versus the system sending the right reminder at the right time (3 days, 1 day, and on expiry) automatically, with a payment link built in. You keep the WhatsApp relationship; we remove the manual work."*

### "I don't need software."

*"Totally fair if you have a handful of members. But the moment you're past 50–60, the register starts costing you money in missed renewals and ghost members you didn't notice leaving. We even have a free Solo Coach tier and a 30-day no-card trial — try it on your real members and see if it pays for itself."*

### "I only have 50 members."

*"That's the perfect size to start — it's exactly when one or two forgotten renewals hurt the most. Our Starter plan covers up to 150 members, so you've got room to grow, and the trial is free for 30 days with no card. Let's load your 50 members and watch one renewal cycle together."*

### "I already use another software."

*"What do you like and dislike about it? Most owners switching to us are frustrated by clunky interfaces, no real WhatsApp automation, or pricing built for big chains. We're built for Indian gyms — Razorpay, UPI, WhatsApp-first, in rupees — and we'll help you move your member list over during onboarding. The trial is free, so you can run both side by side."*

---

# 17. Demo Script (15 minutes)

**Goal:** show the owner *their* gym running inside Gymmobius, ending on the "renewal reminder" magic moment.

**0:00 – 1:00 — Set the frame.**
*"I'm going to show you how Gymmobius runs the boring parts of your gym automatically — members, attendance, payments, and the WhatsApp reminders that bring renewals in. Stop me anytime."*

**1:00 – 3:00 — Add a real member.**
- Add one of *their* actual members live (name, phone, email).
- Assign a plan and set the expiry close to today.
- *"Notice it took 20 seconds, and we'll never lose this record."*

**3:00 – 5:00 — Attendance / QR.**
- Open Attendance, show the **+ Mark Check-in**, then the **downloadable QR banner**.
- *"Print this for your door. Members scan with their camera — no app. One tap and they're checked in."*

**5:00 – 8:00 — Payments.**
- Show the pending payment, then the **Remind** button.
- Explain Razorpay vs UPI and that money goes to *their* account.
- Mark it paid and show the membership auto-extend + the confirmation receipt.

**8:00 – 11:00 — The magic moment: reminders.**
- Show the Communication/notifications flow: *"3 days before expiry, 1 day before, and on the day — automatic WhatsApp with a pay link. You stop chasing; the system does it."*
- Mention ghost-member recall: *"If someone stops coming, we nudge them at 5, 14, and 30 days."*

**11:00 – 13:00 — Website + analytics.**
- Show the auto-generated website with their branding.
- Show the dashboard KPIs and revenue chart.

**13:00 – 15:00 — Close on pricing.**
- *"Starter is ₹799/month, and as one of our first 25 gyms you'd get founder pricing — 50% off for 6 months. There's a 30-day free trial, no card. Want me to set you up right now and import your member list?"*

---

# 18. Onboarding Checklist

From signup to the first successful automated payment reminder:

1. **Create the account** (owner signs up; 30-day trial starts automatically, no card).
2. **Set up the gym profile** — name, logo, colors, city, contact details, working hours.
3. **Choose the payment mode** — connect **Razorpay keys** or set the **UPI** ID.
4. **Create membership plans** — name, price, duration (e.g. Monthly ₹1,500 / 30 days).
5. **Import members** — add manually, or share the **registration link** and approve requests. (Offer to help import their first 10 during onboarding.)
6. **Assign plans + expiry dates** to imported members (use the expiry override to match their real current dates).
7. **Add trainers** (if any) and assign members to them.
8. **Set up attendance** — download and print the **QR banner**, place it at the entrance.
9. **Approve WhatsApp templates in Interakt** (so reminders can send via WhatsApp, not just email).
10. **Confirm Communication settings** — weekly summary channel, email on/off.
11. **Send a test reminder** — pick a member with a near expiry and click **Remind**; confirm it lands.
12. **Watch the first automated cycle** — within a few days, the 3/1/0-day reminders fire on their own.
13. **Review the website** — publish/share the gym's new web address.
14. **Convert to paid** before day 30 to keep full limits (apply founder pricing if slots remain).

✅ **Success milestone:** the owner sees a real member receive an automated WhatsApp/email reminder and renew.

---

# 19. Operational Rules

## Subscription rules

- Four subscription states: **trial → active**, plus **expired** and (rare) **pending/cancelled**.
- An **expired** subscription is a hard stop: no new members, trainers, branches, domain changes, or reminders until renewal. **Data is always preserved.**
- Renewal is via Razorpay; access unlocks immediately on payment.

## Trial rules

- 30 days, no card.
- During trial: 150 members, 2 trainers, **50 WhatsApp messages total**.
- After 30 days without paying → auto-converts to **Solo Coach (Free)** (25 members, 0 trainers, 0 WhatsApp). No data loss.

## Founder pricing rules

- First **25** subscribing gyms only.
- **50% off**, locked for **6 months**.
- Enforced on the server — the 26th signup automatically gets standard pricing.

## Quotas & limits

| | Solo Coach | Starter | Pro | Premium |
|---|---|---|---|---|
| Members | 25 | 150 | 750 | ∞ |
| Trainers | 0 | 2 | 10 | ∞ |
| WhatsApp/mo | 0 | 500 | 3,000 | 15,000 |
| Branches | 1 | 1 | 1 | ∞ |

- WhatsApp resets monthly. Email has no hard cap.
- Member/trainer caps are enforced when adding; existing records over a cap (after downgrade) stay but block new additions.

## Upgrade process

- Subscription page → choose plan → pay via Razorpay → full plan unlocked instantly.
- Hitting a limit shows an in-app upgrade prompt.

## Downgrade process

- Switching to a lower plan works, but **excess members/trainers are not deleted** — only new growth is blocked at the new limit.
- Some Pro/Premium content already created may keep showing on the public site; custom domains stay attached. There's no automatic owner notification on downgrade.

---

# 20. Feature Inventory

> Use this as the definitive "do we have it?" list. **Do not promise anything not marked LIVE.**

## Available today (LIVE)

- Member management: add, edit, delete (soft), revive, duplicate protection
- Member self-registration with owner approval queue
- Membership plans (create/edit/delete) with smart renewal stacking
- Membership statuses + expiry tracking + "expiring soon" dashboard
- Member health metrics (height/weight/age/sex) + history + BMI/BMR/calorie calculators
- QR check-in (gym-wide), printable QR banner, manual check-in, 1-hour cooldown
- Attendance reports: today list, date picker, 7-day chart, monthly trends
- Payment tracking: Razorpay checkout, Razorpay payment links, UPI ("I Paid"), manual/cash
- Per-gym Razorpay connection + webhook auto-confirmation
- Pending payments view + manual "Remind" button
- WhatsApp reminders: payment (3/1/0 days), ghost recall (5/14/30 days), welcome, owner subscription expiry (7/3/1/0), weekly summary
- Email notifications + automatic email fallback for all WhatsApp types
- Email-only: payment receipt, subscription receipt, member invite, trainer invite, find-my-gym
- Ghost-member detection
- Weekly owner summary (Sundays 18:00 IST)
- Dashboard KPIs + recent activity feed
- Analytics: revenue, growth, attendance, status breakdown, revenue CSV export
- Advanced analytics (Pro+): peak hours, churn, cohort retention; extended date ranges
- Trainer management: invites, assigned members, attendance view, workout/diet plan assignment
- Website builder/CMS: sections, theming, images, plans/testimonials/trainers/gallery, legal pages
- SEO: JSON-LD, sitemap, robots, prerender; custom SEO overrides (Pro+)
- Custom subdomain (Pro+), custom apex domain (Premium)
- Multi-branch operations + consolidated reporting (Premium)
- Member app (plan, pay, check-in, workouts, tools, profile) — web/PWA
- Trainer app/dashboard
- 30-day no-card trial
- Founder pricing (25 slots, 50% off, 6 months)
- Subscription billing via Razorpay
- Auth: email/password + Google login; magic-link/invite flows
- Internal Super Admin platform (Gymmobius staff control panel)

## Beta / staged

- **Standalone membership-expiry message template** — exists but not used by the live cron (payment reminders are used instead)
- **Member health trend charts** — history is recorded; the visual trend charts are still being rolled out

## Planned — NOT YET IMPLEMENTED

- Annual/yearly billing
- Subscription cancellation flow + membership pause/freeze
- Premium **API access** (listed in pricing, not built)
- "Bring your own WhatsApp provider" (BYO Interakt)
- Tamil WhatsApp/email templates
- Per-member QR codes
- Full member/payment CSV export
- Manager / receptionist staff roles
- Multi-branch: UI member transfers, per-branch websites, branch-specific domains
- Self-registration: captcha + rate-limiting, branch picker, auto-approve toggle, rejection emails
- Trial-ending and 80%-quota warning emails
- Drag-and-drop website builder + AI content generation
- WhatsApp "Pay Now" buttons; quick-reply buttons on ghost recall
- Paid add-ons (WhatsApp packs, white-label, extra branches, storage, phone support)

## Not available (out of scope today)

- Phone-OTP login
- Hardware turnstile / biometric check-in
- Class scheduling / booking
- Point-of-sale / supplement & retail inventory
- Lead/CRM sales pipeline
- Native iOS/Android store apps (the product is a web app/PWA)

---

*End of Customer Success Playbook. When in doubt, verify against this document's LIVE labels before promising a feature to a customer.*
