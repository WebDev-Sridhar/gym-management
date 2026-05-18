import { SITE } from '../../lib/constants/routes'

// React 19 hoists <title>, <meta>, and <link> tags rendered anywhere in the
// component tree into <head>. No provider, no library required.
export default function SEO({
  title,
  description,
  canonical,
  keywords,
  ogImage,
  ogType = 'website',
  robots = 'index,follow',
}) {
  const fullTitle = title ? `${title} | ${SITE.NAME}` : SITE.NAME
  const canonicalUrl = canonical
    ? (canonical.startsWith('http') ? canonical : `${SITE.URL}${canonical}`)
    : null

  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={robots} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* OpenGraph */}
      <meta property="og:site_name" content={SITE.NAME} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content={ogType} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter */}
      <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </>
  )
}
