import StatsPage from "@/pages/stats-page";
import { createFileRoute } from "@tanstack/react-router";

/** Toolbar breadcrumb — the page header was folded into the report masthead. */
function StatsBreadcrumb() {
  return <span className="text-muted-foreground text-sm">Stats</span>;
}

export const Route = createFileRoute("/(_authed)/projects/$slug/stats/")({
  staticData: {
    toolbarBreadcrumbs: [StatsBreadcrumb],
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <StatsPage slug={slug} />;
}
