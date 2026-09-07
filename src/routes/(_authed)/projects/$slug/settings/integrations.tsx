import { createFileRoute } from "@tanstack/react-router"
import { IntegrationsSection } from "@/components/settings/integrations-section"
import { useSettings } from "@/components/settings/use-settings"
import { CrumbIntegrations } from "@/components/layout/breadcrumbs"

export const Route = createFileRoute("/(_authed)/projects/$slug/settings/integrations")({
  staticData: { toolbarBreadcrumbs: [CrumbIntegrations] },
  component: RouteComponent,
})

function RouteComponent() {
  const { project, canEdit } = useSettings()
  return <IntegrationsSection project={project} canEdit={canEdit} />
}
