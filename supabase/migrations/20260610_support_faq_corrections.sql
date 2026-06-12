-- Support FAQ corrections — fix factually wrong / misleading help articles.
--
-- Audited every published support_faqs row against the actual code and
-- corrected 18 articles (16 with real errors + 2 light improvements). Verified
-- facts: standard pricing 799/1799/4999; member caps 25/150/750/∞; trainer caps
-- 0/2/10/∞; WhatsApp 0/500/3000/15000; reminders fire at 3/1/0 days (email
-- fallback, no SMS); ghost recall 5/14/30; welcome after first payment; member
-- delete is a soft delete (revivable); plan renewals stack; Razorpay is gated by
-- connected keys not plan; custom domain is Premium (built); trainers can't mark
-- attendance; QR check-in requires a signed-in member; data is preserved until
-- manual deletion (no 90-day archive); no WhatsApp STOP/opt-out flow yet.
--
-- Content-only UPDATEs keyed by id. Idempotent (re-runnable).

update support_faqs set answer = $faq$Adding members is the first step to bringing your gym online.

1. From the sidebar, go to **Members**.
2. Click **+ Add Member** in the top-right.
3. Enter the member's **name, 10-digit phone number, and email** — all three are required.
4. Optionally assign a membership plan now to start their billing cycle (you can also do it later).
5. Click **Add Member** to save.

New members appear at the top of the table. Click any row to open their profile and assign plans, trainers, or record payments. To bring in members without typing each one, share your public registration link (Members page → **copy registration link**) and approve requests as they arrive.$faq$
where id = '96ff4b58-ce45-47f1-9304-0fcd8d2839ff';

update support_faqs set answer = $faq$Both plans include the core tools — member management, QR + manual attendance, payment tracking (UPI + Razorpay), WhatsApp + email reminders, trainer accounts, and a public website. The difference is capacity and growth tools.

**Starter (₹799/mo)**: up to **150 active members**, **2 trainer accounts**, **500 WhatsApp reminders/month**, a complete multi-page website, and email support.

**Pro (₹1,799/mo)**: up to **750 active members**, **10 trainer accounts**, **3,000 WhatsApp reminders/month**, plus ghost-member detection, advanced & cohort retention analytics (90-day and 1-year ranges), a custom subdomain, and SEO meta overrides.

For multi-branch chains and a custom domain, see **Premium (₹4,999/mo)**. Change plans anytime from **Account & Settings → Subscription**. All prices are per month.$faq$
where id = 'a1a0d653-1227-4c6f-84ad-61c84305c2da';

update support_faqs set answer = $faq$It depends on the mode you set in **Payment Setup**:

**UPI mode (default)**: a UPI link is included in reminders. Members pay via Google Pay, PhonePe, Paytm, or any UPI app, then tap **"I Paid"** for you to confirm.

**Razorpay mode**: members get a secure Razorpay checkout link supporting UPI, cards, net banking, wallets, and EMI. Razorpay isn't tied to a specific plan — it becomes available once you **connect your own Razorpay keys** in Payment Setup.

You can switch modes anytime from **Payment Setup**.$faq$
where id = '156ee4bb-85b7-481d-b89d-fe4fb724eb7a';

update support_faqs set answer = $faq$Gymmobius automatically reminds members about upcoming renewals.

- Reminders go out **3 days before**, **1 day before**, and **on the day** a member's plan expires.
- They're sent over **WhatsApp** (on paid plans, while quota remains) and **fall back to email** automatically if WhatsApp isn't available.
- Each reminder includes the amount due and a payment link (UPI or Razorpay, per your Payment Setup).
- You can also send a reminder manually anytime from a member's **Payments** tab, or from the **Payments** page.

(Your own subscription-renewal reminders are separate and come to you at 7/3/1/0 days before your plan expires.)$faq$
where id = '58d93e48-d87b-4b83-a724-97b7c5e9e48a';

update support_faqs set answer = $faq$1. Click the member's row in the **Members** page to open the drawer.
2. Switch to the **Plans** tab.
3. Click **Assign plan** and choose one of your gym's plans.
4. The expiry date is calculated automatically from the plan's duration.

Renewals **stack** — if a member still has unused days, the new period is added on top (a 30-day plan with 10 days left becomes 40 days), so members never lose time they've paid for. You can also set a specific renewal date when assigning, to match an existing billing cycle.$faq$
where id = '5532f21a-0043-4b86-b666-f2ac93801fe5';

update support_faqs set answer = $faq$A CSV bulk-import is on our roadmap. In the meantime, two options:

- **Add members manually** from the **Members** page.
- **Share your registration link** (Members page → **copy registration link**). Prospects fill in their own details and land in your approval queue — approve them in one click, no typing.

For a large one-time migration, contact support and we can help import your list.$faq$
where id = 'f84c7773-28ef-4600-afdc-08b58cea5d87';

update support_faqs set answer = $faq$1. Open the member's drawer by clicking their row.
2. Click the **trash icon** in the top-right of the drawer header and confirm.

This removes them from your active members list and frees up a plan slot, but it's **not permanent** — if you later add them again with the same phone or email, their record is restored. If you only want to pause someone, you can simply let their plan expire instead of deleting them.$faq$
where id = '5ae3c6a2-2201-4d0c-a4a7-e7f74c9a2bca';

update support_faqs set answer = $faq$Trainers only see members **assigned to them**. They can:

- View their assigned members' profiles and attendance history.
- Create and assign workout and diet plans.

Trainers **cannot** see your payments or revenue, your gym settings, or other trainers' members — and they don't mark attendance. Attendance is recorded by members scanning the QR, or by you from the **Attendance** page.$faq$
where id = 'd8912c26-8aa4-43e2-a141-d14f7536de5b';

update support_faqs set answer = $faq$Every gym has one unique QR code that members scan to check in.

1. Go to **Check-in** in the sidebar.
2. Click **Download Banner** to save a printable poster, and display it at your entrance.
3. A member opens their phone camera and scans the code.
4. The **first time**, they sign in once; after that, every scan checks them in with a single tap (a 1-hour cooldown prevents accidental double check-ins).
5. Each check-in is logged with a timestamp and appears live on the **Attendance** page.

No app to install. You can also record a check-in manually from the **Attendance** page for anyone without their phone.$faq$
where id = '0a33bb4f-e16a-47d4-a84b-35ca90f99996';

update support_faqs set answer = $faq$A few common reasons:

1. **Not signed in / not a member yet**: check-in requires being signed in as a member of your gym. A first-time visitor is sent to your registration form — approve them, and they can then check in.
2. **Wrong gym**: each gym has its own QR. Scanning another gym's code won't appear in your dashboard.
3. **Cooldown**: there's a 1-hour cooldown between check-ins, so a quick second tap won't create a new record.
4. **Add it manually**: you can always record a check-in from the **Attendance** page.

(Members with expired plans can still check in — Gymmobius doesn't block the door.)$faq$
where id = '9597014b-c64d-4a3c-b082-8e2a8d6da98f';

update support_faqs set answer = $faq$Your gym gets a public website at `gymmobius.com/your-gym-slug`, included on every plan (single-page on the free tier, multi-page on Starter and up).

1. Go to **Website** in the sidebar.
2. Customise your hero, about, plans, trainers, and other sections.
3. Click **Save Changes** — your site is live automatically; there's no separate publish step.
4. Share your public URL with members and prospects.

Your site auto-syncs with your gym's plans, trainers, and testimonials. Public changes can take up to a minute to appear due to caching.$faq$
where id = 'f57534a0-674a-4d59-bb8b-def7cfa03990';

update support_faqs set answer = $faq$Yes. Web-address options by plan:

- **Path URL** (`gymmobius.com/your-slug`): every plan.
- **Custom subdomain** (`your-gym.gymmobius.com`): **Pro**.
- **Custom domain** (`yourgym.com`): **Premium** — set it up under **Website → Custom Domain** by pointing a CNAME; we handle SSL automatically.

(Plans are Starter, Pro, and Premium — there's no "Pro Plus".)$faq$
where id = '865c45a6-7e62-4a11-871c-3bb3ae673ae4';

update support_faqs set answer = $faq$Gymmobius sends WhatsApp messages to your members automatically:

- **Payment reminders**: 3 days before, 1 day before, and on the day a plan expires.
- **Welcome**: after a member's **first successful payment**, confirming their membership is active.
- **"We miss you" (ghost recall)**: if a member stops checking in — at 5, 14, and 30 days of inactivity.

Messages come from a verified business number, so members receive them directly without saving you as a contact. WhatsApp requires a paid plan with available quota; if it can't be sent, the message goes by **email** instead. (Payment receipts are always sent by email.)$faq$
where id = '2af057b3-c986-4305-8cf0-96f16d8c00d4';

update support_faqs set answer = $faq$The most common reasons, in order:

1. **Your plan has no WhatsApp quota**: the free Solo Coach tier sends **0** WhatsApp messages — reminders go by email instead. Starter includes 500/month, Pro 3,000, Premium 15,000.
2. **Monthly quota used up**: once you hit your plan's limit for the month, further reminders fall back to email until next month.
3. **Templates not yet approved**: WhatsApp message templates must be approved before they can send; while pending, messages go by email.
4. **Missing phone number**: the member needs a valid 10-digit number on file (we auto-add +91 for India).
5. **Subscription expired**: automated sending pauses until you renew.

You can see per-message delivery status in your **Communication (Announcements)** activity log.$faq$
where id = 'df49c4ab-beb1-4f85-87e3-91600b3bdeec';

update support_faqs set answer = $faq$1. Click your gym name at the bottom of the sidebar, or go to **Account & Settings → Subscription**.
2. Choose a plan — **Starter, Pro, or Premium**.
3. Click **Proceed to payment** — checkout is handled securely by Razorpay.
4. Once paid, your dashboard unlocks the new plan's features instantly.

If you're one of our first 25 gyms, founder pricing (50% off for 6 months) is applied automatically while slots remain.$faq$
where id = '6a2032f4-0089-4e1a-9c8d-ea625ec697ec';

update support_faqs set answer = $faq$Your gym data stays safe — members, payments, attendance, plans, and your website are all preserved (kept until you choose to delete them; nothing is removed automatically).

While expired, you'll see a renewal banner, and until you renew:

- Adding new members, trainers, or branches is blocked.
- Automated WhatsApp/email reminders pause.

Renewing restores full access immediately. Your public gym website stays online throughout.$faq$
where id = '4be20c41-4aa7-4696-bd44-5a50efd5a0fa';

update support_faqs set answer = $faq$Subscriptions are billed per month and simply expire if not renewed — there's nothing to actively cancel:

- To stop, just don't renew; access ends when the current month finishes.
- No cancellation fees, no questions asked.
- Your data is **preserved** after expiry (not deleted or archived automatically) — renew anytime to pick up where you left off.

To permanently delete your account and data, contact support.$faq$
where id = 'e057ed23-5ea7-4e1f-a3a6-1dafb93aeaf9';

update support_faqs set answer = $faq$1. **Save first**: Unsaved changes don't reflect in the preview — click **Save Changes**.
2. **Hard refresh** the preview tab (Ctrl+Shift+R).
3. **Image issues**: If you uploaded large images, give them 10–20 seconds to optimise.
4. **Browser console**: Open DevTools (F12) and check for errors — share them in a ticket if needed.
5. The public URL (`gymmobius.com/your-slug`) caches for about a minute, so changes may take a moment to appear publicly.$faq$
where id = '82c4bb47-44ef-455c-a520-a54e486ec484';
