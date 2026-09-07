import { createFileRoute } from "@tanstack/react-router"
import { DataSection } from "@/components/settings/data-section"
import { useSettings } from "@/components/settings/use-settings"
import { CrumbData } from "@/components/layout/breadcrumbs"

export const Route = createFileRoute("/(_authed)/projects/$slug/settings/data")({
  staticData: { toolbarBreadcrumbs: [CrumbData] },
  component: RouteComponent,
})

function RouteComponent() {
  const { project, canEdit } = useSettings()
  return <DataSection project={project} canEdit={canEdit} />
}
