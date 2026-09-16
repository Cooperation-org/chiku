import SprintsPage from "@/pages/sprints-page";
import { createFileRoute } from "@tanstack/react-router";
import { CrumbSprints } from "@/components/layout/breadcrumbs";

export const Route = createFileRoute("/(_authed)/projects/$slug/sprints")({
  staticData: {
    toolbarBreadcrumbs: [CrumbSprints],
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <SprintsPage slug={slug} />;
}
