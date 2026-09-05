import { createRootRoute, Outlet, redirect } from "@tanstack/react-router"
import { Toaster } from "@/components/ui/sonner"
import { TanStackDevtools } from "@/lib/components/devtools"
import { saveReturnTo } from "@/lib/auth/returnTo"
import { useAuth } from "@/lib/stores/auth"

// Auth-flow pages are public — the guard never bounces between them
// (redirect loop) and never saves them as a return target (open redirect).
const PUBLIC_PATH = /^\/(login|oauth|auth|sso)(\/|$)/

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const { isAuthenticated } = useAuth.getState()
    if (!PUBLIC_PATH.test(location.pathname) && !isAuthenticated) {
      saveReturnTo(location.pathname + location.search)
      throw redirect({ to: "/login" })
    }
  },
  component: () => (
    <>
      <Outlet />
      <TanStackDevtools />
      <Toaster />
    </>
  ),
})
