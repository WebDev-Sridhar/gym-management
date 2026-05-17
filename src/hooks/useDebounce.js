import { useState, useEffect } from 'react'

/**
 * Debounce a fast-changing value so dependents only see it after `ms` of stillness.
 * Cancels pending updates on unmount or value change.
 */
export function useDebounce(value, ms = 250) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])

  return debounced
}
