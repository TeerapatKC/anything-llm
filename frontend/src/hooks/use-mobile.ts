import * as React from "react"

// Keep this aligned with the min-[1100px] sidebar visibility classes. Below
// this width the desktop sidebar is hidden and the mobile sheet must render.
const MOBILE_BREAKPOINT = 1100

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window === "undefined"
      ? false
      : window.innerWidth < MOBILE_BREAKPOINT
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
