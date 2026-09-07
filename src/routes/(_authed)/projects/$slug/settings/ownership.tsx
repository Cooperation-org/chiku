import { createFileRoute } from "@tanstack/react-router"
import { OwnershipSection } from "@/components/settings/ownership-section"
import { useSettings } from "@/components/settings/use-settings"

export const Route = createFileRoute("/(_authed)/projects/$slug/settings/ownership")({
  component: RouteComponent,
})

function RouteComponent() {
  const { project } = useSettings()
  return <OwnershipSection project={project} />
}
