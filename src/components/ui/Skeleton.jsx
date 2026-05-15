// Reusable skeleton shimmer block. Uses .skeleton-shimmer from index.css.
export function Sk({ h = '100%', w = '100%', r = 8 }) {
  return (
    <div
      className="skeleton-shimmer"
      style={{ height: h, width: w, borderRadius: r, flexShrink: 0 }}
    />
  )
}
