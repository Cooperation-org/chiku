import { createFileRoute } from "@tanstack/react-router"
import { NotificationsSection } from "@/components/settings/notifications-section"
import { useSettings } from "@/components/settings/use-settings"
import { CrumbNotifications } from "@/components/layout/breadcrumbs"

export const Route = createFileRoute("/(_authed)/projects/$slug/settings/notifications")({
  staticData: { toolbarBreadcrumbs: [CrumbNotifications] },
  component: RouteComponent,
})

function RouteComponent() {
  const { project, canEdit } = useSettings()
  return <NotificationsSection project={project} canEdit={canEdit} />
}
