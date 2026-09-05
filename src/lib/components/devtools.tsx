import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

/**
 * TanStack devtools, opt-in even on production deployments: set
 * localStorage.enableTSDeTools = "true" and reload.
 */
export function TanStackDevtools() {
  const enabled =
    typeof window !== "undefined" && localStorage.getItem("enableTSDeTools") === "true"
  if (!enabled) return null
  return (
    <>
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </>
  )
}
