import { useState } from "react"
import { toast } from "sonner"
import { useNavigate } from "@tanstack/react-router"
import { Board } from "@/components/board/board"
import { BoardToolbar } from "@/components/board/board-toolbar"
import { CreateStoryDialog } from "@/components/app/create-story-dialog"
import { ColumnEditorDialog } from "@/components/app/column-editor-dialog"
import { IssueModal } from "@/components/app/issue-modal"
import { Button } from "@/components/ui/button"
import { useMemberships } from "@/lib/queries/memberships"
import { useProjectBySlug } from "@/lib/queries/projects"
import { isArchived, unarchiveProject } from "@/lib/api/projects"
import { useSetStoryStatus, useStories, useStatuses } from "@/lib/queries/stories"
import { EMPTY_FILTER, filterStories } from "@/lib/filters/stories"
import { qk, queryClient } from "@/lib/query"
import type { UserStory } from "@/lib/api/types"

interface BoardPageProps {
  slug: string
  /** The `?story=` deep-link ref, owned by the route. */
  storyRef: number | undefined
  onStoryRefChange: (ref: number | undefined) => void
}

export default function BoardPage({ slug, storyRef, onStoryRefChange }: BoardPageProps) {
  const navigate = useNavigate()
  const { project: currentProject } = useProjectBySlug(slug)
  const projectId = currentProject?.id ?? null

  const { data: statuses = [], isLoading: statusesLoading } = useStatuses(projectId)
  const { data: stories, isLoading: storiesLoading } = useStories(projectId)
  const { data: memberships } = useMemberships(projectId)
  const setStatus = useSetStoryStatus(projectId ?? 0)

  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [createStatusId, setCreateStatusId] = useState<number | null>(null)
  const [showColumnEditor, setShowColumnEditor] = useState(false)

  const members = (memberships ?? []).map((m) => ({
    id: m.user,
    full_name: m.full_name,
    username: m.full_name || "user",
  }))

  const visible = filterStories(stories ?? [], { ...EMPTY_FILTER, q: search })

  const selectedStory: UserStory | null = storyRef
    ? (visible.find((s) => s.ref === storyRef) ?? null)
    : null

  function handleMoveStory(story: UserStory, newStatusId: number) {
    setStatus.mutate(
      { storyId: story.id, statusId: newStatusId, version: story.version },
      {
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Failed to update story"
          if (msg.toLowerCase().includes("permission")) {
            toast.error("You do not have permission to move stories in this project.")
          } else {
            toast.error(msg)
          }
        },
      }
    )
  }

  async function handleUnarchive() {
    if (!currentProject) return
    try {
      await unarchiveProject(currentProject)
      queryClient.invalidateQueries({ queryKey: qk.projects })
    } catch (err) {
      toast.error(`Failed to unarchive: ${(err as Error).message}`)
    }
  }

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">
          {statusesLoading || storiesLoading ? "Loading board..." : "Select a project to view the board"}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {isArchived(currentProject) && (
        <div className="flex items-center justify-between border-b bg-amber-500/10 px-4 py-1.5 text-sm text-amber-600 dark:text-amber-400">
          <span>This project is archived.</span>
          <Button size="sm" variant="outline" onClick={handleUnarchive}>
            Unarchive
          </Button>
        </div>
      )}

      <BoardToolbar
        slug={slug}
        search={search}
        onSearchChange={setSearch}
        onEditColumns={() => setShowColumnEditor(true)}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        {statusesLoading || storiesLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">Loading board...</div>
          </div>
        ) : (
          <Board
            statuses={statuses}
            stories={visible}
            onMoveStory={handleMoveStory}
            onSelect={(story) =>
              navigate({ to: ".", search: { story: story.ref }, replace: true })
            }
            onAddToColumn={(statusId) => {
              setCreateStatusId(statusId)
              setShowCreate(true)
            }}
            onEditColumns={() => setShowColumnEditor(true)}
            onNewList={() => setShowColumnEditor(true)}
          />
        )}
      </div>

      {selectedStory && (
        <IssueModal
          story={selectedStory}
          statuses={statuses}
          members={members}
          onClose={() => onStoryRefChange(undefined)}
          onUpdate={(updated) => {
            queryClient.setQueryData<UserStory[]>(qk.stories(currentProject.id), (old) =>
              old?.map((s) => (s.id === updated.id ? updated : s))
            )
          }}
          onDelete={(id) => {
            onStoryRefChange(undefined)
            queryClient.setQueryData<UserStory[]>(qk.stories(currentProject.id), (old) =>
              old?.filter((s) => s.id !== id)
            )
          }}
        />
      )}

      <CreateStoryDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        projectId={currentProject.id}
        statuses={statuses}
        defaultStatusId={createStatusId}
        members={members}
      />

      <ColumnEditorDialog
        open={showColumnEditor}
        onOpenChange={setShowColumnEditor}
        projectId={currentProject.id}
        onUpdated={() => {
          queryClient.invalidateQueries({ queryKey: qk.statuses(currentProject.id) })
        }}
      />
    </div>
  )
}
