import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { routeTree } from "./routeTree.gen"
import { queryClient } from "@/lib/query"
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)
