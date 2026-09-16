import { createFileRoute } from "@tanstack/react-router";
import { CrumbMember, CrumbMembers } from "@/components/layout/breadcrumbs";
import MemberPage from "@/pages/member-page";

export const Route = createFileRoute("/(_authed)/projects/$slug/members/$username")({
  staticData: {
    toolbarBreadcrumbs: [CrumbMembers, CrumbMember],
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { slug, username } = Route.useParams();
  return <MemberPage slug={slug} username={username} />;
}
