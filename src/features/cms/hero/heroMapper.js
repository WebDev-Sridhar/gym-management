export function mapHeroData({ gym, content, defaults }) {
  const slug = gym?.slug

  return {
    title: content?.hero_title || defaults.hero.title,
    subtitle: content?.hero_subtitle || defaults.hero.subtitle,

    primaryCTA: {
      label: defaults.hero.primaryCTA.label,
      link: `/${slug}/pricing`,
    },

    secondaryCTA: {
      label: defaults.hero.secondaryCTA.label,
      link: `/${slug}/trainers`,
    },

    backgroundImage:
      content?.hero_image || defaults.hero.backgroundImage,

    imageDescription:
      content?.hero_image_desc || defaults.hero.imageDescription,

    overlayOpacity: content?.overlay_opacity ?? 0.5,

    badge: gym?.name
      ? `${gym.name} · ${defaults.hero.badge}`
      : defaults.hero.badge,
  }
}