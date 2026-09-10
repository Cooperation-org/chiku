import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { broadcastQueryClient } from "@tanstack/query-broadcast-client-experimental"
import { routeTree } from "./routeTree.gen"
import { queryClient, queryPersistOptions } from "@/lib/query"
import { useAuth } from "@/lib/stores/auth"
import { applyBrand } from "@/lib/brand"
import { PageError, PageLoading, PageNotFound } from "@/components/layout/page-state"
import "./index.css"

// Sync localStorage tokens into the store before the first route guard runs.
useAuth.getState().init()

// Re-apply the deployment brand (idempotent): the inline script in index.html
// already did this pre-paint; this covers any path where it did not.
applyBrand()

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  // Unified page states (see components/layout/page-state.tsx): the same
  // components render for route-loader pending/errors, unmatched URLs, and
  // per-page React Query branches. Pending timings avoid flash-of-spinner
  // on fast loader resolutions.
  defaultPendingComponent: () => (
    <div className="h-dvh">
      <PageLoading label="Loading" />
    </div>
  ),
  defaultPendingMs: 300,
  defaultPendingMinMs: 500,
  defaultErrorComponent: ({ error, reset }) => (
    <div className="h-dvh">
      <PageError
        message={error instanceof Error ? error.message : undefined}
        onRetry={reset}
      />
    </div>
  ),
  defaultNotFoundComponent: () => (
    <div className="h-dvh">
      <PageNotFound />
    </div>
  ),
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// Sync the query cache across open tabs: a mutation in one tab lands in the
// others instantly (which then refetch fresh server data). Module scope —
// runs once for the app lifetime, never re-subscribed by StrictMode.
if (typeof BroadcastChannel !== "undefined") {
  broadcastQueryClient({ queryClient })
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={queryPersistOptions}>
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  </StrictMode>
)
