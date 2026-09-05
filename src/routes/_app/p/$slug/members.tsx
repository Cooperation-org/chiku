import MembersPage from "@/pages/members-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/p/$slug/members")({
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <MembersPage slug={slug} />;
}
