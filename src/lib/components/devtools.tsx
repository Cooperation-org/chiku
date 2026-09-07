import {
  TanStackDevtools as TanStackDevtoolsPanel,
} from "@tanstack/react-devtools"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import { tableDevtoolsPlugin } from "@tanstack/react-table-devtools"

/**
 * One TanStack dev panel, three inspectors: Router, Query and Table —
 * mounted on the unified @tanstack/react-devtools workbench instead of
 * three floating triggers. On in dev; on production behind the
 * localStorage.enableTSDeTools flag (and @tanstack/devtools-vite strips
 * the imports and JSX from production builds regardless).
 */
export function TanStackDevtools() {
  const enabled =
    !import.meta.env.PROD ||
    (typeof window !== "undefined" &&
      localStorage.getItem("enableTSDeTools") === "true")
  if (!enabled) return null

  return (
    <TanStackDevtoolsPanel
      config={{ position: "bottom-right" }}
      plugins={[
        {
          name: "TanStack Router",
          render: <TanStackRouterDevtoolsPanel />,
        },
        {
          name: "TanStack Query",
          render: <ReactQueryDevtoolsPanel />,
        },
        tableDevtoolsPlugin(),
      ]}
    />
  )
}
