-- ────────────────────────────────────────────────────────────────
-- Help & Support v1 — FAQ knowledge base + ticket system
-- ────────────────────────────────────────────────────────────────

-- ── Categories (global) ──
create table support_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  icon        text not null,
  sort_order  int  not null default 0,
  is_active   bool not null default true,
  created_at  timestamptz not null default now()
);

-- ── FAQs (global) ──
create table support_faqs (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references support_categories(id) on delete cascade,
  question     text not null,
  answer       text not null,
  keywords     text[] not null default '{}',
  view_count   int  not null default 0,
  is_pinned    bool not null default false,
  is_published bool not null default true,
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_faqs_category on support_faqs(category_id) where is_published;
create index idx_faqs_pinned   on support_faqs(is_pinned, view_count desc) where is_published;

-- ── Tickets (per-gym) ──
create table support_tickets (
  id              uuid primary key default gen_random_uuid(),
  gym_id          uuid not null references gyms(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  email           text not null,
  subject         text not null,
  category        text not null,
  priority        text not null default 'normal',
  message         text not null,
  screenshot_url  text,
  status          text not null default 'open',
  assigned_to     uuid references auth.users(id),
  internal_notes  text,
  resolution      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  constraint support_tickets_priority_chk check (priority in ('low','normal','high','urgent')),
  constraint support_tickets_status_chk   check (status   in ('open','pending','resolved','closed'))
);

create index idx_tickets_gym    on support_tickets(gym_id, created_at desc);
create index idx_tickets_status on support_tickets(status, created_at desc);

-- ── RLS ──
alter table support_categories enable row level security;
alter table support_faqs       enable row level security;
alter table support_tickets    enable row level security;

create policy "categories readable by authenticated" on support_categories
  for select to authenticated using (is_active);

create policy "faqs readable by authenticated" on support_faqs
  for select to authenticated using (is_published);

create policy "faqs view count update" on support_faqs
  for update to authenticated using (true) with check (true);

create policy "tickets read own gym" on support_tickets
  for select to authenticated
  using (gym_id in (select gym_id from users where id = auth.uid()));

create policy "tickets insert own gym" on support_tickets
  for insert to authenticated
  with check (
    gym_id in (select gym_id from users where id = auth.uid())
    and user_id = auth.uid()
  );

create policy "tickets reopen own" on support_tickets
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── RPC: increment view count ──
create or replace function increment_faq_view(p_faq_id uuid)
returns void language sql security definer set search_path = public as $$
  update support_faqs set view_count = view_count + 1 where id = p_faq_id;
$$;

grant execute on function increment_faq_view(uuid) to authenticated;

-- ────────────────────────────────────────────────────────────────
-- Seed: 10 categories + 29 starter FAQs
-- (Seed data lives in this migration so re-creating the DB locally
-- starts with a working knowledge base.)
-- ────────────────────────────────────────────────────────────────

insert into support_categories (slug, name, description, icon, sort_order) values
  ('getting-started',  'Getting Started',         'Set up your gym and learn the basics',            'Rocket',         1),
  ('billing-payments', 'Billing & Payments',      'Connect Razorpay and collect dues from members',  'CreditCard',     2),
  ('members',          'Members',                 'Add, manage and assign plans to your members',    'Users',          3),
  ('trainers',         'Trainers',                'Invite trainers and manage permissions',           'UserCheck',      4),
  ('attendance',       'Attendance & Check-in',   'QR check-in and attendance tracking',              'QrCode',         5),
  ('website',          'Gym Website',             'Customise and publish your public gym site',       'Globe',          6),
  ('whatsapp',         'WhatsApp & Notifications','Set up automated reminders and notifications',     'MessageSquare',  7),
  ('subscription',     'Subscription & Plans',    'Upgrade, renew or change your Gymmobius plan',     'Crown',          8),
  ('account',          'Account & Security',      'Profile, password and account settings',           'Lock',           9),
  ('troubleshooting',  'Troubleshooting',         'Fix common issues and errors',                     'AlertTriangle',  10);

-- FAQ rows are inserted via Supabase MCP at migration time.
-- See `supabase/seeds/support_faqs.sql` for the full seed payload
-- (kept separate to keep this migration file readable).
