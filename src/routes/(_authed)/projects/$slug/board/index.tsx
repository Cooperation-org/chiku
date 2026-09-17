import BoardPage from "@/pages/board-page";
import { BoardToolbarControls } from "@/components/board/board-toolbar-controls";
import { BoardSprintRail } from "@/components/board/board-sprint-rail";
import { SprintScopeCrumb } from "@/components/sprints/sprint-scope-picker";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { CrumbBoard } from "@/components/layout/breadcrumbs";
import { parseSprintIdsParam } from "@/lib/sprints";

/** Legacy `?story=<ref>` deep links redirect to the canonical /board/<ref>. `q` filters the board, `sprint` scopes it to a comma-separated sprint set. */
type BoardSearch = { story?: number; q?: string; sprint?: string };

export const Route = createFileRoute("/(_authed)/projects/$slug/board/")({
  validateSearch: (search: Record<string, unknown>): BoardSearch => {
    const out: BoardSearch = {};
    const raw = search.story;
    if (raw !== undefined && raw !== null && raw !== "") {
      const story = Number(raw);
      if (Number.isFinite(story)) out.story = story;
    }
    if (typeof search.q === "string" && search.q !== "") out.q = search.q;
    // Single ids (`12`), legacy numbers, and lists (`12,13`) all funnel
    // through the parser; empty/junk input means "all tasks" (no param).
    const rawSprint = search.sprint;
    if ((typeof rawSprint === "string" || typeof rawSprint === "number") && rawSprint !== "") {
      const ids = parseSprintIdsParam(rawSprint);
      if (ids.length > 0) out.sprint = ids.join(",");
    }
    return out;
  },
  beforeLoad: ({ params, search }) => {
    const { story, q } = search as BoardSearch;
    if (story !== undefined) {
      throw redirect({
        to: "/projects/$slug/board/$storyRef",
        params: { slug: params.slug, storyRef: String(story) },
        search: q ? { q } : undefined,
        replace: true,
      });
    }
  },
  staticData: {
    toolbarBreadcrumbs: [CrumbBoard, SprintScopeCrumb],
    toolbarCenter: [BoardSprintRail],
    toolbarControls: [BoardToolbarControls],
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  const { q, sprint } = Route.useSearch();
  return <BoardPage slug={slug} q={q} sprintIds={parseSprintIdsParam(sprint)} />;
}
