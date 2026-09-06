import { createFileRoute } from "@tanstack/react-router"
import { SettingsLayout } from "@/components/settings/settings-layout"

export const Route = createFileRoute("/(_authed)/projects/$slug/settings")({
  component: RouteComponent,
})

function RouteComponent() {
  const { slug } = Route.useParams()
  return <SettingsLayout slug={slug} />
}
