import { useEffect, useState } from "react"

export function CohortNav({ org }: { org?: string | null }) {
  const [mounted, setMounted] = useState(true)

  useEffect(() => {
    const existing = document.querySelector("script[data-cohort-nav]")
    if (existing) return
    const pinned = import.meta.env.VITE_COHORT_NAV_SRC
    // Deployments pin the bar URL themselves (VITE_COHORT_NAV_SRC); without a
    // pin it is conventionally served by the bare apex of this host.
    const host = location.hostname.split(".").slice(-2).join(".")
    // Pinned value is a full script URL — use it directly, not as a hostname.
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
