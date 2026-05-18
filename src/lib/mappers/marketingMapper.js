// Shape-normalizing mappers. Today they pass through static content from
// /lib/content/*. When a CMS backs these pages, the raw row will arrive with
// snake_case fields — these mappers will translate to the component shape.

function safeSeo(raw) {
  return {
    title: raw?.title || raw?.seo_title || '',
    description: raw?.description || raw?.seo_description || '',
    canonical: raw?.canonical || raw?.canonical_url || '',
    keywords: raw?.keywords || '',
    ogImage: raw?.ogImage || raw?.og_image || '',
    robots: raw?.robots || 'index,follow',
  }
}

function safeHero(raw) {
  return {
    eyebrow: raw?.eyebrow || '',
    title: raw?.title || raw?.hero_title || '',
    subtitle: raw?.subtitle || raw?.hero_subtitle || '',
    cta: raw?.cta || null,
  }
}

function safeSections(raw) {
  return Array.isArray(raw) ? raw : []
}

export function mapAboutData(raw) {
  return {
    seo: safeSeo(raw?.seo),
    hero: safeHero(raw?.hero),
    mission: {
      title: raw?.mission?.title || 'Our Mission',
      body: raw?.mission?.body || '',
    },
    vision: {
      title: raw?.vision?.title || 'Our Vision',
      body: raw?.vision?.body || '',
    },
  }
}

export function mapFeaturesData(raw) {
  return {
    seo: safeSeo(raw?.seo),
    hero: safeHero(raw?.hero),
    features: safeSections(raw?.features),
    cta: raw?.cta || null,
  }
}

export function mapPricingData(raw) {
  return {
    seo: safeSeo(raw?.seo),
    hero: safeHero(raw?.hero),
    plans: safeSections(raw?.plans),
  }
}

export function mapDemoData(raw) {
  return {
    seo: safeSeo(raw?.seo),
    hero: safeHero(raw?.hero),
    cta: raw?.cta || null,
  }
}

export function mapChangelogData(raw) {
  return {
    seo: safeSeo(raw?.seo),
    hero: safeHero(raw?.hero),
    entries: safeSections(raw?.entries),
  }
}

export function mapBlogData(raw) {
  return {
    seo: safeSeo(raw?.seo),
    hero: safeHero(raw?.hero),
    posts: safeSections(raw?.posts),
  }
}

export function mapCareersData(raw) {
  return {
    seo: safeSeo(raw?.seo),
    hero: safeHero(raw?.hero),
    jobs: safeSections(raw?.jobs),
  }
}

export function mapContactData(raw) {
  return {
    seo: safeSeo(raw?.seo),
    hero: safeHero(raw?.hero),
    form: {
      nameLabel: raw?.form?.nameLabel || 'Your Name',
      emailLabel: raw?.form?.emailLabel || 'Your Email',
      phoneLabel: raw?.form?.phoneLabel || 'Phone (optional)',
      messageLabel: raw?.form?.messageLabel || 'Your Message',
      submitLabel: raw?.form?.submitLabel || 'Send Message',
      successMessage: raw?.form?.successMessage || 'Thanks! We’ll get back to you within 24 hours.',
    },
  }
}
