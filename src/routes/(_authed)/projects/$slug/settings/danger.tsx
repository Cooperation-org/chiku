import { createFileRoute } from "@tanstack/react-router"
import { DangerSection } from "@/components/settings/danger-section"
import { SettingsGuard } from "@/components/settings/settings-layout"
import { useSettings } from "@/components/settings/use-settings"
import { CrumbDanger } from "@/components/layout/breadcrumbs"

export const Route = createFileRoute("/(_authed)/projects/$slug/settings/danger")({
  staticData: { toolbarBreadcrumbs: [CrumbDanger] },
  component: RouteComponent,
})

function RouteComponent() {
  const { project } = useSettings()
  return (
    <SettingsGuard section="danger">
      <DangerSection project={project} />
    </SettingsGuard>
  )
}
