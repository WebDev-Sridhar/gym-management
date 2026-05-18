import { useEffect } from 'react'

/**
 * useDocumentHead — declaratively set document title and key meta tags,
 * with automatic restore-on-unmount so navigation away from a page
 * reverts to the previous values.
 *
 * Useful for tenant (gym) public pages that need their own brand metadata
 * (title, OG image, favicon, theme-color) without affecting the SaaS shell
 * when the user navigates back.
 *
 * Usage:
 *   useDocumentHead({
 *     title: gym.name,
 *     description: gym.description,
 *     ogImage: gym.logo_url,
 *     themeColor: gym.theme_color,
 *     favicon: gym.logo_url,
 *   })
 *
 * Pass undefined / null to leave a field alone. Empty string is treated
 * the same — it never clears the existing meta tag.
 */

function setMetaContent(name, content, attr = 'name') {
  if (content == null || content === '') return null
  // Try existing tag first
  let el = document.head.querySelector(`meta[${attr}="${name}"]`)
  const prev = el ? el.getAttribute('content') : null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
  return prev
}

function restoreMetaContent(name, prev, attr = 'name') {
  const el = document.head.querySelector(`meta[${attr}="${name}"]`)
  if (!el) return
  if (prev == null) el.remove()
  else el.setAttribute('content', prev)
}

function setIcon(href) {
  if (!href) return null
  const el = document.head.querySelector('link[rel="icon"]') ||
             document.head.querySelector('link[rel="shortcut icon"]')
  const prev = el ? el.getAttribute('href') : null
  if (el) el.setAttribute('href', href)
  return prev
}

function restoreIcon(prev) {
  const el = document.head.querySelector('link[rel="icon"]') ||
             document.head.querySelector('link[rel="shortcut icon"]')
  if (el && prev != null) el.setAttribute('href', prev)
}

export function useDocumentHead({
  title,
  description,
  ogTitle,
  ogDescription,
  ogImage,
  ogUrl,
  themeColor,
  favicon,
} = {}) {
  useEffect(() => {
    const snapshots = {
      title: document.title,
      description:    null,
      ogTitle:        null,
      ogDescription:  null,
      ogImage:        null,
      ogUrl:          null,
      twTitle:        null,
      twDescription:  null,
      twImage:        null,
      themeColor:     null,
      favicon:        null,
    }

    if (title) document.title = title
    if (description)    snapshots.description    = setMetaContent('description',     description)
    if (ogTitle || title)             snapshots.ogTitle       = setMetaContent('og:title',       ogTitle ?? title,             'property')
    if (ogDescription || description) snapshots.ogDescription = setMetaContent('og:description', ogDescription ?? description, 'property')
    if (ogImage)        snapshots.ogImage       = setMetaContent('og:image',       ogImage, 'property')
    if (ogUrl)          snapshots.ogUrl         = setMetaContent('og:url',         ogUrl,   'property')
    if (ogTitle || title)             snapshots.twTitle       = setMetaContent('twitter:title',       ogTitle ?? title)
    if (ogDescription || description) snapshots.twDescription = setMetaContent('twitter:description', ogDescription ?? description)
    if (ogImage)        snapshots.twImage       = setMetaContent('twitter:image', ogImage)
    if (themeColor)     snapshots.themeColor    = setMetaContent('theme-color',   themeColor)
    if (favicon)        snapshots.favicon       = setIcon(favicon)

    return () => {
      document.title = snapshots.title
      if (description)    restoreMetaContent('description',     snapshots.description)
      if (ogTitle || title)             restoreMetaContent('og:title',       snapshots.ogTitle,       'property')
      if (ogDescription || description) restoreMetaContent('og:description', snapshots.ogDescription, 'property')
      if (ogImage)        restoreMetaContent('og:image',       snapshots.ogImage,       'property')
      if (ogUrl)          restoreMetaContent('og:url',         snapshots.ogUrl,         'property')
      if (ogTitle || title)             restoreMetaContent('twitter:title',       snapshots.twTitle)
      if (ogDescription || description) restoreMetaContent('twitter:description', snapshots.twDescription)
      if (ogImage)        restoreMetaContent('twitter:image',   snapshots.twImage)
      if (themeColor)     restoreMetaContent('theme-color',     snapshots.themeColor)
      if (favicon)        restoreIcon(snapshots.favicon)
    }
  }, [title, description, ogTitle, ogDescription, ogImage, ogUrl, themeColor, favicon])
}
