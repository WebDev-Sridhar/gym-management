-- ────────────────────────────────────────────────────────────────
-- Per-gym SEO overrides for the website builder (Pro+ feature)
-- ────────────────────────────────────────────────────────────────

alter table gyms
  add column if not exists seo_description text,
  add column if not exists seo_og_image    text,
  add column if not exists seo_keywords    text;

comment on column gyms.seo_description is 'Custom meta description for social shares (overrides gym.description)';
comment on column gyms.seo_og_image    is 'Custom 1200x630 OG image URL (overrides gym.logo_url)';
comment on column gyms.seo_keywords    is 'Comma-separated keywords for search engines';
