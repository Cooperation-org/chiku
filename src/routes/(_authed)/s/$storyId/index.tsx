import { createFileRoute, redirect } from "@tanstack/react-router"
import { queryClient } from "@/lib/query"
import { getUserStory } from "@/lib/api/userstories"

// Universal short link: /s/125 resolves the globally-unique story id to its
// canonical project-scoped URL. Invalid ids fall through to the not-found page.
export const Route = createFileRoute("/(_authed)/s/$storyId/")({
  loader: async ({ params }) => {
    const id = Number(params.storyId)
    if (!Number.isFinite(id)) return null
    try {
      const story = await queryClient.ensureQueryData({
        queryKey: ["story", id] as const,
        queryFn: () => getUserStory(id),
      })
      const slug = story.project_extra_info?.slug
      if (!slug) return null
      throw redirect({
        to: "/projects/$slug/board/$storyRef",
        params: { slug, storyRef: String(story.ref) },
        replace: true,
      })
    } catch {
      return null
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-muted-foreground">Story not found.</div>
    </div>
  )
}
