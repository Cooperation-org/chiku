import { Outlet, createRootRoute } from "@tanstack/react-router"
import { Toaster } from "@/components/ui/sonner"
import { TanStackDevtools } from "@/lib/components/devtools"

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <TanStackDevtools />
      <Toaster />
    </>
  ),
})
