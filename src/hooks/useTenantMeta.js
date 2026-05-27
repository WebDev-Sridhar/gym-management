/**
 * useTenantMeta — syncs document <head> metadata with the resolved tenant gym.
 *
 * Call this inside any component that has access to the resolved gym object
 * (currently wired into GymProvider so it fires on every gym page).
 *
 * What it updates:
 *   • document.title
 *   • <meta name="description">
 *   • <meta name="theme-color">
 *   • <meta name="application-name">
 *   • <meta name="apple-mobile-web-app-title">
 *   • <meta property="og:title|description|site_name">
 *   • <meta name="twitter:title|description">
 *   • <link rel="icon"> (only when gym has a logo_url)
 *
 * On unmount it restores the generic Gymmobius defaults written in index.html
 * so navigating back to the main domain doesn't keep a tenant's branding.
 */

import { useEffect } from 'react'

const DEFAULTS = {
  title:       'Gymmobius | Run Your Gym Like a Business',
  description: 'The all-in-one platform to manage members, track payments, automate WhatsApp reminders, and grow your gym.',
  themeColor:  '#6366f1',
  appName:     'Gymmobius',
}

function setMeta(nameOrProp, content, attr = 'name') {
  let el = document.querySelector(`meta[${attr}="${CSS.escape(nameOrProp)}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, nameOrProp)
    document.head.appendChild(el)
  }
  el.content = content
}

function setFaviconPng(href) {
  // Update (or create) the explicit PNG favicon tag; leave svg/ico tags alone.
  let el = document.querySelector('link[rel="icon"][type="image/png"]')
  if (!el) {
    el = document.createElement('link')
    el.rel  = 'icon'
    el.type = 'image/png'
    document.head.appendChild(el)
  }
  el.href = href
}

export function useTenantMeta(gym) {
  useEffect(() => {
    if (!gym) return

    const name        = gym.name || 'Gym'
    const title       = `${name} | Gym`
    const description = gym.seo_description || gym.description ||
      `${name} — premium fitness facility.`
    const themeColor  = gym.theme_color || DEFAULTS.themeColor

    document.title = title

    setMeta('description',                  description)
    setMeta('theme-color',                  themeColor)
    setMeta('application-name',             name)
    setMeta('apple-mobile-web-app-title',   name)

    setMeta('og:title',       title,       'property')
    setMeta('og:description', description, 'property')
    setMeta('og:site_name',   name,        'property')

    setMeta('twitter:title',       title)
    setMeta('twitter:description', description)

    if (gym.logo_url) {
      setFaviconPng(gym.logo_url)
    }

    return () => {
      document.title = DEFAULTS.title
      setMeta('description',                DEFAULTS.description)
      setMeta('theme-color',                DEFAULTS.themeColor)
      setMeta('application-name',           DEFAULTS.appName)
      setMeta('apple-mobile-web-app-title', DEFAULTS.appName)

      setMeta('og:title',       DEFAULTS.title,       'property')
      setMeta('og:description', DEFAULTS.description, 'property')
      setMeta('og:site_name',   DEFAULTS.appName,     'property')

      setMeta('twitter:title',       DEFAULTS.title)
      setMeta('twitter:description', DEFAULTS.description)
    }
    // Re-run only when meaningful gym fields change, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gym?.id, gym?.name, gym?.theme_color, gym?.logo_url, gym?.seo_description, gym?.description])
}
