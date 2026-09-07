import EpicsPage from "@/pages/epics-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(_authed)/projects/$slug/epics")({
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <EpicsPage slug={slug} />;
}
