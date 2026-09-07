import { createFileRoute } from "@tanstack/react-router"
import WhatsNewVersionPage from "@/pages/whats-new-version-page"

export const Route = createFileRoute("/_public/whats-new/$version")({
  component: RouteComponent,
})

function RouteComponent() {
  const { version } = Route.useParams()
  return <WhatsNewVersionPage version={version} />
}
