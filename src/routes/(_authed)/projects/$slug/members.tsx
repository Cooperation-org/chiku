import MembersPage from "@/pages/members-page";
import { createFileRoute } from "@tanstack/react-router";
import { CrumbMembers } from "@/components/layout/breadcrumbs";

export const Route = createFileRoute("/(_authed)/projects/$slug/members")({
  staticData: { toolbarBreadcrumbs: [CrumbMembers] },
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <MembersPage slug={slug} />;
}
