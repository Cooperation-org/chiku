import BoardPage from "@/pages/board-page";
import { BoardViewOptions } from "@/components/board/board-view-options";
import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy `?story=<ref>` deep links redirect to the canonical /board/<ref>. */
type BoardSearch = { story?: number };

export const Route = createFileRoute("/(_authed)/projects/$slug/board/")({
  validateSearch: (search: Record<string, unknown>): BoardSearch => {
    const raw = search.story;
    if (raw === undefined || raw === null || raw === "") return {};
    const story = Number(raw);
    return Number.isFinite(story) ? { story } : {};
  },
  beforeLoad: ({ params, search }) => {
    const { story } = search as BoardSearch;
    if (story !== undefined) {
      throw redirect({
        to: "/projects/$slug/board/$storyRef",
        params: { slug: params.slug, storyRef: String(story) },
        replace: true,
      });
    }
  },
  staticData: { toolbarControls: [BoardViewOptions] },
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <BoardPage slug={slug} />;
}
