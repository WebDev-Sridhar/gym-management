/** Shimmer skeleton block — admin-dark variant of the owner app's `Sk`. */
export default function Sk({ h = 16, w = '100%', r = 8, className = '', style = {} }) {
  return (
    <span
      className={`admin-shimmer ${className}`}
      style={{
        display: 'block',
        height: typeof h === 'number' ? `${h}px` : h,
        width: typeof w === 'number' ? `${w}px` : w,
        borderRadius: typeof r === 'number' ? `${r}px` : r,
        background:
          'linear-gradient(90deg, var(--a-shimmer-base) 25%, var(--a-shimmer-hi) 37%, var(--a-shimmer-base) 63%)',
        backgroundSize: '400% 100%',
        animation: 'adminShimmer 1.4s ease infinite',
        ...style,
      }}
    />
  )
}
