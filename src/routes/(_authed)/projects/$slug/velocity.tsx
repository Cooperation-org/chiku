import VelocityPage from "@/pages/velocity-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(_authed)/projects/$slug/velocity")({
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <VelocityPage slug={slug} />;
}
