import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"
import { AppShell } from "@/components/layout/app-shell"
import { saveReturnTo } from "@/lib/auth/returnTo"
import { useAuth } from "@/lib/stores/auth"

// Layout route for everything that requires a signed-in user: the auth
// guard lives here (not on __root), so public routes stay truly public.
export const Route = createFileRoute("/(_authed)")({
  beforeLoad: ({ location }) => {
    const { isAuthenticated } = useAuth.getState()
    if (!isAuthenticated) {
      saveReturnTo(location.pathname + location.search)
      throw redirect({ to: "/login" })
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})
