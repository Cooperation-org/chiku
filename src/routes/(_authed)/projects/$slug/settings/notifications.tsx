import { createFileRoute } from "@tanstack/react-router"
import { NotificationsSection } from "@/components/settings/notifications-section"
import { useSettings } from "@/components/settings/use-settings"

export const Route = createFileRoute("/(_authed)/projects/$slug/settings/notifications")({
  component: RouteComponent,
})

function RouteComponent() {
  const { project, canEdit } = useSettings()
  return <NotificationsSection project={project} canEdit={canEdit} />
}
