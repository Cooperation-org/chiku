import { useState } from "react"
import { toast } from "sonner"
import { useNavigate } from "@tanstack/react-router"
import { Board } from "@/components/board/board"
import { CreateStoryDialog } from "@/components/app/create-story-dialog"
import { ColumnEditorDialog } from "@/components/app/column-editor-dialog"
import { PagePresence, PageTransition } from "@/components/layout/page-transition"
import { PageLoading } from "@/components/layout/page-state"
import { ModuleDisabled } from "@/components/project/module-disabled"
import { Button } from "@/components/ui/button"
import { useProjectBySlug } from "@/lib/queries/projects"
import { isArchived, unarchiveProject } from "@/lib/api/projects"
import { useReorderKanbanOrder, useSetStoryStatus, useStories, useStatuses } from "@/lib/queries/stories"
import { EMPTY_FILTER, filterStories } from "@/lib/filters/stories"
import { qk, queryClient } from "@/lib/query"
import { viewEnabled } from "@/lib/project-views"
import { useBoardStore } from "@/lib/stores/board"
import type { UserStory } from "@/lib/api/types"

interface BoardPageProps {
  slug: string
  /** Client-side text filter, carried by the board route's ?q= param. */
  q?: string
}

export default function BoardPage({ slug, q = "" }: BoardPageProps) {
  const navigate = useNavigate()
  const { project: currentProject } = useProjectBySlug(slug)
  const projectId = currentProject?.id ?? null

  const { data: statuses = [], isLoading: statusesLoading } = useStatuses(projectId)
  const { data: stories, isLoading: storiesLoading } = useStories(projectId)
  const setStatus = useSetStoryStatus(projectId ?? 0)
  const reorderKanban = useReorderKanbanOrder(projectId ?? 0)

  const [showCreate, setShowCreate] = useState(false)
  const [createStatusId, setCreateStatusId] = useState<number | null>(null)
  const columnEditorOpen = useBoardStore((s) => s.columnEditorOpen)
  const setColumnEditorOpen = useBoardStore((s) => s.setColumnEditorOpen)

  const visible = filterStories(stories ?? [], { ...EMPTY_FILTER, q })

  function handleMoveStory(story: UserStory, newStatusId: number) {
    const statusName = statuses.find((s) => s.id === newStatusId)?.name ?? "another column"
    setStatus.mutate(
      { storyId: story.id, statusId: newStatusId, version: story.version },
      {
        onSuccess: () => {
          toast.success(`#${story.ref} moved to ${statusName}`)
        },
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

  /**
   * In-column reorder: splice the dragged card before the card dropped upon
   * (or at the column end when dropped on empty space), then persist the
   * column's order through bulk_update_kanban_order — reverting on failure.
   * Positions are computed against the column's own cards from the full
   * cache, so a search filter hiding cards can't misplace the drop.
   */
  function handleReorderStory(storyId: number, overId: number | null, statusId: number) {
    if (!projectId) return
    const key = qk.stories(projectId)
    const all = queryClient.getQueryData<UserStory[]>(key)
    if (!all) return
    const moving = all.find((s) => s.id === storyId)
    if (!moving) return
    const column = all
      .filter((s) => s.status === statusId && s.id !== storyId)
      .sort((a, b) => a.kanban_order - b.kanban_order)
    const overIdx = overId == null ? -1 : column.findIndex((s) => s.id === overId)
    const insertAt = overIdx === -1 ? column.length : overIdx
    const reordered = [...column.slice(0, insertAt), moving, ...column.slice(insertAt)]
    const reorderedIds = new Set(reordered.map((s) => s.id))
    const next = [...all.filter((s) => !reorderedIds.has(s.id)), ...reordered]
    queryClient.setQueryData(key, next)
    const columnOrder = reordered.map((s) => s.id)
    const position = columnOrder.indexOf(storyId) + 1
    const statusName = statuses.find((s) => s.id === statusId)?.name ?? "the column"
    reorderKanban.mutate(
      { storyIds: columnOrder, statusId },
      {
        onSuccess: () => {
          toast.success(`#${moving.ref} moved to position ${position} in ${statusName}`)
        },
        onError: (err) => {
          queryClient.invalidateQueries({ queryKey: key })
          toast.error(err instanceof Error ? err.message : "Failed to save order")
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

  const isLoading = statusesLoading || storiesLoading

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">
          {isLoading ? "Loading board..." : "Select a project to view the board"}
        </div>
      </div>
    )
  }

  if (!viewEnabled(currentProject, "board")) {
    return <ModuleDisabled view="Board" slug={slug} />
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

      <div className="min-h-0 flex-1 overflow-hidden">
        <PagePresence>
          {isLoading ? (
            <PageLoading key="loading" label="Loading board" />
          ) : (
            <PageTransition key="board">
              <Board
                statuses={statuses}
                stories={visible}
                onMoveStory={handleMoveStory}
                onReorderStory={handleReorderStory}
                onSelect={(story) =>
                  navigate({
                    to: "/projects/$slug/board/$storyRef",
                    params: { slug, storyRef: String(story.ref) },
                  })
                }
                onAddToColumn={(statusId) => {
                  setCreateStatusId(statusId)
                  setShowCreate(true)
                }}
                onEditColumns={() => setColumnEditorOpen(true)}
                onNewList={() => setColumnEditorOpen(true)}
              />
            </PageTransition>
          )}
        </PagePresence>
      </div>

      <CreateStoryDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        projectId={currentProject.id}
        defaultStatusId={createStatusId}
      />

      <ColumnEditorDialog
        open={columnEditorOpen}
        onOpenChange={setColumnEditorOpen}
        projectId={currentProject.id}
        onUpdated={() => {
          queryClient.invalidateQueries({ queryKey: qk.statuses(currentProject.id) })
        }}
      />
    </div>
  )
}
