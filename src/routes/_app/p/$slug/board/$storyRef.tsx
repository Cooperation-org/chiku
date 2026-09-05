import SingleStoryPage from "@/pages/single-story-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/p/$slug/board/$storyRef")({
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
