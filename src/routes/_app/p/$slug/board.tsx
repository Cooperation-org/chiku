import BoardPage from "@/pages/board-page";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

/** `?story=<ref>` is the deep-link contract the dashboard relies on. */
type BoardSearch = { story?: number };

export const Route = createFileRoute("/_app/p/$slug/board")({
  validateSearch: (search: Record<string, unknown>): BoardSearch => {
    const raw = search.story;
    if (raw === undefined || raw === null || raw === "") return {};
    const story = Number(raw);
    return Number.isFinite(story) ? { story } : {};
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  const { story } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <BoardPage
      slug={slug}
      storyRef={story}
      onStoryRefChange={(ref) =>
        navigate({ to: ".", search: ref === undefined ? {} : { story: ref }, replace: true })
      }
    />
  );
}
