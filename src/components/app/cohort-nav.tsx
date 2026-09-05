import { useEffect, useState } from "react"

// The cohort's cross-app bar, the same one workers.vc, GovKit, amebo and elm
// mount, so a person who reaches the board from the dash can get back out of
// it. The script is served by the app that owns it (workers.vc); Marten only
// says where to find it.
//
// VITE_COHORT_NAV_SRC pins that address. Unset, the address is derived from
// the page's own registrable domain — marten.workers.vc asks workers.vc —
// and a deployment that has no such bundle drops the element when the script
// fails to load, so a standalone Marten shows nothing.
export function CohortNav({ org }: { org?: string | null }) {
  const [mounted, setMounted] = useState(true)

  useEffect(() => {
    const existing = document.querySelector("script[data-cohort-nav]")
    if (existing) return
    const pinned = import.meta.env.VITE_COHORT_NAV_SRC
    const host = location.hostname.split(".").slice(-2).join(".")
    const src = pinned || (host ? `https://${host}/static/embed/cohort-nav.js` : "")
    if (!src) {
      setMounted(false)
      return
    }
    const s = document.createElement("script")
    s.src = src
    s.defer = true
    s.dataset.cohortNav = ""
    s.onerror = () => setMounted(false)
    document.head.appendChild(s)
  }, [])

  if (!mounted) return null
  // The key remounts the custom element so it re-reads data-org when the
  // selected project changes.
  return <cohort-nav key={org ?? ""} data-org={org || undefined} data-current="board" />
}

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "cohort-nav": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        "data-org"?: string
        "data-current"?: string
      }
    }
  }
}
