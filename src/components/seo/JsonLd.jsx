/**
 * JsonLd — renders a schema.org node as a <script type="application/ld+json">.
 *
 * React 19 hoists <script> with a recognised type into <head>, so this works
 * anywhere in the tree (same mechanism as <SEO>). Accepts a single object or
 * an array; null/undefined entries are skipped so callers can pass the result
 * of a builder that may return null (e.g. breadcrumbSchema([])).
 */
export default function JsonLd({ data }) {
  const nodes = (Array.isArray(data) ? data : [data]).filter(Boolean)
  if (nodes.length === 0) return null
  return (
    <>
      {nodes.map((node, i) => (
        <script
          key={i}
          type="application/ld+json"
          // Schema is built from trusted, static app data — not user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
        />
      ))}
    </>
  )
}
