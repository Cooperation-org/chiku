import VelocityPage from "@/pages/velocity-page";
import { createFileRoute } from "@tanstack/react-router";
import { CrumbVelocity } from "@/components/layout/breadcrumbs";

export const Route = createFileRoute("/(_authed)/projects/$slug/velocity")({
  staticData: { toolbarBreadcrumbs: [CrumbVelocity] },
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <VelocityPage slug={slug} />;
}
