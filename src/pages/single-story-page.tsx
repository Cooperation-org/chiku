import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { IssueModal } from "@/components/app/issue-modal"
import { Button } from "@/components/ui/button"
import { PagePresence, PageTransition } from "@/components/layout/page-transition"
import { PageLoading, PageNotFound } from "@/components/layout/page-state"
import { useMemberships, useMentionable } from "@/lib/queries/memberships"
import { useProjectBySlug } from "@/lib/queries/projects"
import { useStatuses, useStoryByRef } from "@/lib/queries/stories"
import { qk, queryClient } from "@/lib/query"
import type { UserStory } from "@/lib/api/types"

interface SingleStoryPageProps {
  slug: string
  storyRef: number
}

/**
 * The canonical story view — /p/<slug>/board/<ref>. Deep-linkable on its own,
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
  const { data: mentionable = [] } = useMentionable(projectId)

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

  // Loading ⇄ content ⇄ not-found all crossfade through one presence, so
  // ref-to-ref navigation (goToRef) never hard-cuts.
  return (
    <PagePresence>
      {isLoading ? (
        <PageLoading key="loading" label="Loading story" />
      ) : isError || !story ? (
        <PageNotFound
          key="missing"
          title={`Story #${storyRef} was not found`}
          description="It may have been deleted or moved to another project."
          action={
            <Button variant="outline" onClick={goBack}>
              Back to board
            </Button>
          }
        />
      ) : (
        <PageTransition key={story.id}>
          <IssueModal
            story={story}
            statuses={statuses}
            members={members}
            mentionable={mentionable}
            canModerate={currentProject.i_am_admin ?? false}
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
        </PageTransition>
      )}
    </PagePresence>
  )
}
