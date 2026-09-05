import BacklogPage from "@/pages/backlog-page";
import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy `?story=<ref>` deep links redirect to the canonical story view. */
type BacklogSearch = { story?: number };

export const Route = createFileRoute("/(_authed)/projects/$slug/backlog")({
  validateSearch: (search: Record<string, unknown>): BacklogSearch => {
    const raw = search.story;
    if (raw === undefined || raw === null || raw === "") return {};
    const story = Number(raw);
    return Number.isFinite(story) ? { story } : {};
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
  return <BacklogPage slug={slug} />;
}
