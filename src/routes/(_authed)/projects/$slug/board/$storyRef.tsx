import SingleStoryPage from "@/pages/single-story-page";
import { StoryActionsSlot, StoryBreadcrumbSlot } from "@/components/story/story-slots";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(_authed)/projects/$slug/board/$storyRef")({
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
