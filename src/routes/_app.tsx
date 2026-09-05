import { Outlet, createFileRoute } from "@tanstack/react-router"
import { Shell } from "@/components/app/shell"

// Pathless layout for the authenticated app: everything under it shares the
// sidebar shell and requires auth (enforced by the root guard).
export const Route = createFileRoute("/_app")({
  component: () => (
    <Shell>
      <Outlet />
    </Shell>
  ),
})
