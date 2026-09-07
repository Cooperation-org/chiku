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
      // location.search is TanStack's parsed object, not a string; concatenating
      // it throws "Cannot convert object to primitive value" (null-proto coercion)
      // and the whole app fails to load for any signed-out visitor. href is the
      // full path+search string.
      saveReturnTo(location.href)
      throw redirect({ to: "/login" })
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})
