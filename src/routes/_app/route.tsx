import { Outlet, createFileRoute } from "@tanstack/react-router"
import { AppShell } from "@/components/layout/app-shell"

// Pathless layout for the authenticated app: everything under it shares the
// GitLab-style chrome (top bar, toolbar bar, super sidebar) and requires auth
// (enforced by the root guard).
export const Route = createFileRoute("/_app")({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})
