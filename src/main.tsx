import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { broadcastQueryClient } from "@tanstack/query-broadcast-client-experimental"
import { routeTree } from "./routeTree.gen"
import { queryClient, queryPersistOptions } from "@/lib/query"
import { useAuth } from "@/lib/stores/auth"
import { BrandLogo } from "@/components/app/brand-logo"
import "./index.css"

// Sync localStorage tokens into the store before the first route guard runs.
useAuth.getState().init()

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultNotFoundComponent: () => (
    <div className="flex h-screen flex-col items-center justify-center gap-2">
      <BrandLogo className="h-12 w-12 opacity-50" />
      <p className="font-semibold">Page not found</p>
      <p className="text-muted-foreground text-sm">That URL does not match any view.</p>
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
