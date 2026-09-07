import OverviewPage from "@/pages/overview-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(_authed)/projects/$slug/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <OverviewPage slug={slug} />;
}
