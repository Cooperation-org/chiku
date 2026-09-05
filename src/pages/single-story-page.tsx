import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { IssueModal } from "@/components/app/issue-modal"
import { Button } from "@/components/ui/button"
import { useMemberships } from "@/lib/queries/memberships"
import { useProjectBySlug } from "@/lib/queries/projects"
import { useStatuses, useStoryByRef } from "@/lib/queries/stories"
import { qk, queryClient } from "@/lib/query"
import type { UserStory } from "@/lib/api/types"

interface SingleStoryPageProps {
  slug: string
  storyRef: number
}

/**
 * The canonical story view â€” /p/<slug>/board/<ref>. Deep-linkable on its own,
 * reached from the board, the backlog and My Tasks. The story resolves
 * straight by its human ref, no list walk needed.
 */
export default function SingleStoryPage({ slug, storyRef }: SingleStoryPageProps) {
  const navigate = useNavigate()
  const { project: currentProject } = useProjectBySlug(slug)
  const projectId = currentProject?.id ?? null

  const { data: story, isLoading, isError } = useStoryByRef(projectId, storyRef)
  const { data: statuses = [] } = useStatuses(projectId)
  const { data: memberships } = useMemberships(projectId)

  const members = (memberships ?? []).map((m) => ({
    id: m.user,
    full_name: m.full_name,
    username: m.full_name || "user",
  }))

  function goBack() {
    navigate({ to: "/projects/$slug/board", params: { slug } })
  }

  function goToRef(ref: number) {
    navigate({
      to: "/projects/$slug/board/$storyRef",
      params: { slug, storyRef: String(ref) },
    })
  }

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Select a project to view its stories</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading story...</div>
      </div>
    )
  }

  if (isError || !story) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="text-muted-foreground">Story #{storyRef} was not found in this project.</div>
        <Button variant="outline" onClick={goBack}>
          Back to board
        </Button>
      </div>
    )
  }

  return (
    <IssueModal
      story={story}
      statuses={statuses}
      members={members}
      onClose={goBack}
      onNavigateRef={goToRef}
      onUpdate={(updated) => {
        queryClient.setQueryData<UserStory[]>(qk.stories(currentProject.id), (old) =>
          old?.map((s) => (s.id === updated.id ? updated : s))
        )
      }}
      onDelete={(id) => {
        queryClient.setQueryData<UserStory[]>(qk.stories(currentProject.id), (old) =>
          old?.filter((s) => s.id !== id)
        )
        toast(`Deleted #${storyRef}`)
        goBack()
      }}
    />
  )
}
