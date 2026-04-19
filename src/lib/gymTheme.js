// ── Color Space Conversions ──

function hexToHSL(hex) {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s
  const l = (max + min) / 2
  if (max === min) { h = s = 0 } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function hexToRGB(hex) {
  hex = hex.replace('#', '')
  return `${parseInt(hex.substring(0, 2), 16)}, ${parseInt(hex.substring(2, 4), 16)}, ${parseInt(hex.substring(4, 6), 16)}`
}

// ── Theme Generator ──

export function generateGymTheme(primaryHex = '#8B5CF6') {
  const { h, s, l } = hexToHSL(primaryHex)
  // Color safety: clamp luminance for dark-bg readability
  const safeLightness = l > 65 ? 52 : l < 30 ? 48 : l
  const safeSaturation = Math.min(Math.max(s, 60), 90)
  const safePrimary = hslToHex(h, safeSaturation, safeLightness)
  // Secondary: 25° analogous shift (keeps gradient harmonious)
  const secondary = hslToHex((h + 25) % 360, Math.min(safeSaturation, 85), Math.min(safeLightness + 8, 62))
  const primaryRGB = hexToRGB(safePrimary)
  // Glow variant (semi-transparent)
  const primaryGlow = `rgba(${primaryRGB}, 0.18)`
  const primaryGlowStrong = `rgba(${primaryRGB}, 0.35)`
  return {
    primary: safePrimary,
    secondary,
    primaryRGB,
    primaryGlow,
    primaryGlowStrong,
    gradient: `linear-gradient(135deg, ${safePrimary}, ${secondary})`,
    gradientSubtle: `linear-gradient(135deg, rgba(${primaryRGB}, 0.15), rgba(${hexToRGB(secondary)}, 0.15))`,
    gradientDiagonal: `linear-gradient(120deg, ${safePrimary} 0%, ${secondary} 100%)`,
  }
}

// ── Design Control Maps ──

const HEADING_SIZES = {
  sm: { h1: 'clamp(2.5rem, 6vw, 5rem)',    h2: 'clamp(2rem, 4vw, 3.5rem)'   },
  md: { h1: 'clamp(3.5rem, 9vw, 8rem)',    h2: 'clamp(2.8rem, 6vw, 5rem)'   },
  lg: { h1: 'clamp(4.5rem, 11vw, 10rem)',  h2: 'clamp(3.5rem, 8vw, 7rem)'   },
  xl: { h1: 'clamp(5.5rem, 13vw, 12rem)',  h2: 'clamp(4rem, 9vw, 8rem)'     },
}

const SHADOW_MAP = {
  none: 'none',
  sm:   '0 2px 8px rgba(0,0,0,0.12)',
  md:   '0 8px 30px rgba(0,0,0,0.20)',
  lg:   '0 20px 60px rgba(0,0,0,0.35)',
}

const SPACING_MAP = {
  compact:  '3rem',
  normal:   '5rem',
  spacious: '8rem',
}

/**
 * Full theme vars from the entire gym record.
 * Respects secondary_color, card_style, border_radius, shadow_intensity,
 * spacing, heading_size and theme_mode (dark | light).
 */
export function getFullThemeCSSVars(gym = {}) {
  const t = generateGymTheme(gym.theme_color || '#8B5CF6')

  // Use stored secondary if set, otherwise auto-generated
  const secondary = gym.secondary_color || t.secondary
  const secRGB = hexToRGB(secondary)

  const gradient        = `linear-gradient(135deg, ${t.primary}, ${secondary})`
  const gradientDiag    = `linear-gradient(120deg, ${t.primary} 0%, ${secondary} 100%)`
  const gradientSubtle  = `linear-gradient(135deg, rgba(${t.primaryRGB},0.15), rgba(${secRGB},0.15))`

  const sizes    = HEADING_SIZES[gym.heading_size] ?? HEADING_SIZES.md
  const shadow   = SHADOW_MAP[gym.shadow_intensity]   ?? SHADOW_MAP.md
  const sectionPy = SPACING_MAP[gym.spacing]          ?? SPACING_MAP.normal
  // card_style='sharp' overrides border_radius
  const cardRadius = gym.card_style === 'sharp'     ? '4px'
                   : gym.border_radius != null       ? `${gym.border_radius}px`
                   : '16px'

  const isDark = (gym.theme_mode ?? 'dark') !== 'light'
  const themeColors = isDark ? {
    '--gym-bg':            '#080808',
    '--gym-surface':       '#0f0f0f',
    '--gym-card':          '#161616',
    '--gym-card-hover':    '#1e1e1e',
    '--gym-border':        'rgba(255,255,255,0.07)',
    '--gym-border-strong': 'rgba(255,255,255,0.14)',
    '--gym-text':          '#FFFFFF',
    '--gym-text-secondary':'rgba(255,255,255,0.62)',
    '--gym-text-muted':    'rgba(255,255,255,0.35)',
  } : {
    '--gym-bg':            '#FAFAFA',
    '--gym-surface':       '#F3F4F6',
    '--gym-card':          '#FFFFFF',
    '--gym-card-hover':    '#F9FAFB',
    '--gym-border':        'rgba(0,0,0,0.08)',
    '--gym-border-strong': 'rgba(0,0,0,0.15)',
    '--gym-text':          '#0F0F0F',
    '--gym-text-secondary':'rgba(15,15,15,0.65)',
    '--gym-text-muted':    'rgba(15,15,15,0.4)',
  }

  return {
    '--gym-primary':          t.primary,
    '--gym-secondary':        secondary,
    '--gym-primary-rgb':      t.primaryRGB,
    '--gym-glow':             t.primaryGlow,
    '--gym-glow-strong':      t.primaryGlowStrong,
    '--gym-gradient':         gradient,
    '--gym-gradient-subtle':  gradientSubtle,
    '--gym-gradient-diagonal':gradientDiag,
    '--gym-card-radius':      cardRadius,
    '--gym-shadow':           shadow,
    '--gym-section-py':       sectionPy,
    '--gym-h1-size':          sizes.h1,
    '--gym-h2-size':          sizes.h2,
    ...themeColors,
  }
}

// ── Font Stack Mapper ──

const FONT_STACKS = {
  default:  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif:    'Georgia, "Times New Roman", Times, serif',
  mono:     '"Courier New", Courier, "Lucida Console", monospace',
  display:  'Impact, "Arial Narrow", "Franklin Gothic Medium", sans-serif',
  humanist: '"Trebuchet MS", "Gill Sans", Arial, sans-serif',
}

export function getFontStack(fontFamily) {
  return FONT_STACKS[fontFamily] || FONT_STACKS.default
}

// ── CSS Variable Injector ──

export function getThemeCSSVars(primaryHex) {
  const t = generateGymTheme(primaryHex)
  return {
    // Accent colors
    '--gym-primary': t.primary,
    '--gym-secondary': t.secondary,
    '--gym-primary-rgb': t.primaryRGB,
    '--gym-glow': t.primaryGlow,
    '--gym-glow-strong': t.primaryGlowStrong,
    '--gym-gradient': t.gradient,
    '--gym-gradient-subtle': t.gradientSubtle,
    '--gym-gradient-diagonal': t.gradientDiagonal,
    // Dark theme base
    '--gym-bg': '#080808',
    '--gym-surface': '#0f0f0f',
    '--gym-card': '#161616',
    '--gym-card-hover': '#1e1e1e',
    '--gym-border': 'rgba(255,255,255,0.07)',
    '--gym-border-strong': 'rgba(255,255,255,0.14)',
    '--gym-text': '#FFFFFF',
    '--gym-text-secondary': 'rgba(255,255,255,0.62)',
    '--gym-text-muted': 'rgba(255,255,255,0.35)',
  }
}
