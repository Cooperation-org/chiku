import BoardPage from "@/pages/board-page";
import { BoardToolbarControls } from "@/components/board/board-toolbar-controls";
import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy `?story=<ref>` deep links redirect to the canonical /board/<ref>. `q` filters the board. */
type BoardSearch = { story?: number; q?: string };

export const Route = createFileRoute("/(_authed)/projects/$slug/board/")({
  validateSearch: (search: Record<string, unknown>): BoardSearch => {
    const out: BoardSearch = {};
    const raw = search.story;
    if (raw !== undefined && raw !== null && raw !== "") {
      const story = Number(raw);
      if (Number.isFinite(story)) out.story = story;
    }
    if (typeof search.q === "string" && search.q !== "") out.q = search.q;
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
  staticData: { toolbarControls: [BoardToolbarControls] },
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  const { q } = Route.useSearch();
  return <BoardPage slug={slug} q={q} />;
}
