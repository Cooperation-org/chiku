import BacklogPage from "@/pages/backlog-page";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { CrumbBacklog } from "@/components/layout/breadcrumbs";
import { BacklogToolbarControls } from "@/components/backlog/backlog-toolbar-controls";
import { BacklogFilterControl } from "@/components/backlog/backlog-filter-control";

/** Legacy `?story=<ref>` deep links redirect to the canonical story view. */
type BacklogSearch = { story?: number; q?: string };

export const Route = createFileRoute("/(_authed)/projects/$slug/backlog")({
  staticData: {
    toolbarBreadcrumbs: [CrumbBacklog],
    toolbarControls: [BacklogFilterControl, BacklogToolbarControls],
  },
  validateSearch: (search: Record<string, unknown>): BacklogSearch => {
    const out: BacklogSearch = {};
    const raw = search.story;
    if (raw !== undefined && raw !== null && raw !== "") {
      const story = Number(raw);
      if (Number.isFinite(story)) out.story = story;
    }
    if (typeof search.q === "string" && search.q !== "") out.q = search.q;
    return out;
  },
  beforeLoad: ({ params, search }) => {
    const { story } = search as BacklogSearch;
    if (story !== undefined) {
      throw redirect({
        to: "/projects/$slug/board/$storyRef",
        params: { slug: params.slug, storyRef: String(story) },
        replace: true,
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  const { q } = Route.useSearch();
  return <BacklogPage slug={slug} filter={q ?? ""} />;
}
