import { createFileRoute } from "@tanstack/react-router"
import { WebhooksSection } from "@/components/settings/webhooks-section"
import { useSettings } from "@/components/settings/use-settings"
import { CrumbWebhooks } from "@/components/layout/breadcrumbs"

export const Route = createFileRoute("/(_authed)/projects/$slug/settings/webhooks")({
  staticData: { toolbarBreadcrumbs: [CrumbWebhooks] },
  component: RouteComponent,
})

function RouteComponent() {
  const { project, canEdit } = useSettings()
  return <WebhooksSection project={project} canEdit={canEdit} />
}
