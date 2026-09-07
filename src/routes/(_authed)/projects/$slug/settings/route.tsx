import { createFileRoute } from "@tanstack/react-router"
import { SettingsLayout } from "@/components/settings/settings-layout"
import { CrumbSettings } from "@/components/layout/breadcrumbs"

export const Route = createFileRoute("/(_authed)/projects/$slug/settings")({
  staticData: { toolbarBreadcrumbs: [CrumbSettings] },
  component: RouteComponent,
})

function RouteComponent() {
  const { slug } = Route.useParams()
  return <SettingsLayout slug={slug} />
}
