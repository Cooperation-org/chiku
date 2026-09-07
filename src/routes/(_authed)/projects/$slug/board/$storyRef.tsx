import SingleStoryPage from "@/pages/single-story-page";
import { StoryActionsSlot, StoryBreadcrumbSlot } from "@/components/story/story-slots";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(_authed)/projects/$slug/board/$storyRef")({
  validateSearch: (search: Record<string, unknown>): { comment?: number; q?: string } => {
    const next: { comment?: number; q?: string } = {};
    const raw = search.comment;
    if (raw !== undefined && raw !== null && raw !== "") {
      const comment = Number(raw);
      if (Number.isFinite(comment)) next.comment = comment;
    }
    if (typeof search.q === "string" && search.q) next.q = search.q;
    return next;
  },
  staticData: {
    toolbarBreadcrumbs: [StoryBreadcrumbSlot],
    toolbarControls: [StoryActionsSlot],
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { slug, storyRef } = Route.useParams();
  const ref = Number(storyRef);
  if (!Number.isFinite(ref)) {
    return <p className="text-muted-foreground p-6">Invalid story reference.</p>;
  }
  return <SingleStoryPage slug={slug} storyRef={ref} />;
}
