import StatsPage from "@/pages/stats-page";
import { createFileRoute } from "@tanstack/react-router";
import { CrumbStats } from "@/components/layout/breadcrumbs";

export const Route = createFileRoute("/(_authed)/projects/$slug/stats/")({
  staticData: { toolbarBreadcrumbs: [CrumbStats] },
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <StatsPage slug={slug} />;
}
