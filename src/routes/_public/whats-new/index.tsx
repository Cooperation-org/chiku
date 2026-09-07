import { createFileRoute } from "@tanstack/react-router"
import WhatsNewPage from "@/pages/whats-new-page"

export const Route = createFileRoute("/_public/whats-new/")({
  component: RouteComponent,
})

function RouteComponent() {
  return <WhatsNewPage />
}
