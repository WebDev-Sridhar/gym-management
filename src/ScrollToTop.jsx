import { useEffect } from "react"
import { useLocation } from "react-router-dom"

export default function ScrollToTop() {
  const { pathname } = useLocation()

  window.scrollTo({
  top: 0,
  behavior: "smooth"
})

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}