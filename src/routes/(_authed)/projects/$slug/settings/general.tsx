import { createFileRoute } from "@tanstack/react-router"
import { BrandSection } from "@/components/settings/brand-section"
import { GeneralSection } from "@/components/settings/general-section"
import { ModulesSection } from "@/components/settings/modules-section"
import { useSettings } from "@/components/settings/use-settings"
import { CrumbGeneral } from "@/components/layout/breadcrumbs"

export const Route = createFileRoute("/(_authed)/projects/$slug/settings/general")({
  staticData: { toolbarBreadcrumbs: [CrumbGeneral] },
  component: RouteComponent,
})

function RouteComponent() {
  const { project, canEdit } = useSettings()
  return (
    <div className="space-y-6">
      <GeneralSection project={project} canEdit={canEdit} />
      <BrandSection project={project} canEdit={canEdit} />
      <ModulesSection project={project} canEdit={canEdit} />
    </div>
  )
}
