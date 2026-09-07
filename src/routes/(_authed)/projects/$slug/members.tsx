import MembersPage from "@/pages/members-page";
import { createFileRoute } from "@tanstack/react-router";
import { CrumbMembers } from "@/components/layout/breadcrumbs";
import { MembersToolbarControls } from "@/components/members/members-toolbar-controls";

export const Route = createFileRoute("/(_authed)/projects/$slug/members")({
  staticData: {
    toolbarBreadcrumbs: [CrumbMembers],
    toolbarControls: [MembersToolbarControls],
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <MembersPage slug={slug} />;
}
