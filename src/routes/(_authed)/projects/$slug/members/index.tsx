import MembersPage from "@/pages/members-page";
import { createFileRoute } from "@tanstack/react-router";
import { CrumbMembers } from "@/components/layout/breadcrumbs";
import { MembersToolbarControls } from "@/components/members/members-toolbar-controls";
import { MembersFilterControl } from "@/components/members/members-filter-control";

type MembersSearch = { q?: string };

export const Route = createFileRoute("/(_authed)/projects/$slug/members/")({
  staticData: {
    toolbarBreadcrumbs: [CrumbMembers],
    toolbarControls: [MembersFilterControl, MembersToolbarControls],
  },
  validateSearch: (search: Record<string, unknown>): MembersSearch => {
    const out: MembersSearch = {};
    if (typeof search.q === "string" && search.q !== "") out.q = search.q;
    return out;
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  const { q } = Route.useSearch();
  return <MembersPage slug={slug} filter={q ?? ""} />;
}
