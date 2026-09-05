import BacklogPage from "@/pages/backlog-page";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

type BacklogSearch = { story?: number };

export const Route = createFileRoute("/_app/p/$slug/backlog")({
  validateSearch: (search: Record<string, unknown>): BacklogSearch => {
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
    <BacklogPage
      slug={slug}
      storyRef={story}
      onStoryRefChange={(ref) =>
        navigate({ to: ".", search: ref === undefined ? {} : { story: ref }, replace: true })
      }
    />
  );
}
