import * as React from "react";

// Switch to the drawer layout before the 292px sidebar starts squeezing the
// application's content columns. Keep this in sync with the 1100px visibility
// classes used by the main and settings mobile top bars. At 1100px the 292px
// sidebar still leaves roughly 808px for settings and split-pane content.
const MOBILE_BREAKPOINT = 1100;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window === "undefined"
      ? false
      : window.innerWidth < MOBILE_BREAKPOINT
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
