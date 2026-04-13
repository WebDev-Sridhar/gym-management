// ── Color Space Conversions ──

function hexToHSL(hex) {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h, s
  const l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
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
  s /= 100
  l /= 100
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
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

// ── Theme Generator ──

export function generateGymTheme(primaryHex = '#8B5CF6') {
  const { h, s, l } = hexToHSL(primaryHex)

  // Color safety: clamp luminance for readability
  const safeLightness = l > 65 ? 50 : l < 25 ? 35 : l
  const safeSaturation = Math.min(s, 90)

  const safePrimary = hslToHex(h, safeSaturation, safeLightness)

  // Secondary: 30° analogous shift, slightly lighter
  const secondaryHue = (h + 30) % 360
  const secondary = hslToHex(secondaryHue, Math.min(safeSaturation, 85), Math.min(safeLightness + 10, 60))

  // Variations
  const primaryLight = hslToHex(h, Math.max(safeSaturation - 10, 20), Math.min(safeLightness + 35, 92))
  const primaryDark = hslToHex(h, safeSaturation, Math.max(safeLightness - 15, 15))
  const primaryRGB = hexToRGB(safePrimary)

  return {
    primary: safePrimary,
    secondary,
    primaryLight,
    primaryDark,
    primaryRGB,
    gradient: `linear-gradient(135deg, ${safePrimary}, ${secondary})`,
    gradientSubtle: `linear-gradient(135deg, ${safePrimary}15, ${secondary}15)`,
  }
}

// ── CSS Variable Injector ──

export function getThemeCSSVars(primaryHex) {
  const theme = generateGymTheme(primaryHex)
  return {
    '--gym-primary': theme.primary,
    '--gym-secondary': theme.secondary,
    '--gym-primary-light': theme.primaryLight,
    '--gym-primary-dark': theme.primaryDark,
    '--gym-primary-rgb': theme.primaryRGB,
    '--gym-gradient': theme.gradient,
    '--gym-gradient-subtle': theme.gradientSubtle,
  }
}
