import { useMemo, useState } from "react"
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
import { useMilestones, useMoveStoryToSprint } from "@/lib/queries/milestones"
import { EMPTY_FILTER, filterStories } from "@/lib/filters/stories"
import { qk, queryClient } from "@/lib/query"
import { viewEnabled } from "@/lib/project-views"
import { useBoardStore } from "@/lib/stores/board"
import type { UserStory } from "@/lib/api/types"

interface BoardPageProps {
  slug: string
  /** Client-side text filter, carried by the board route's ?q= param. */
  q?: string
  /** Sprint scope, carried by the board route's ?sprint= param (milestone ids). Empty = all tasks. */
  sprintIds?: number[]
}

export default function BoardPage({ slug, q = "", sprintIds = [] }: BoardPageProps) {
  const navigate = useNavigate()
  const { project: currentProject } = useProjectBySlug(slug)
  const projectId = currentProject?.id ?? null

  const { data: statuses = [], isLoading: statusesLoading } = useStatuses(projectId)
  const { data: stories, isLoading: storiesLoading } = useStories(projectId)
  const { data: milestones = [], isLoading: milestonesLoading } = useMilestones(projectId)
  const setStatus = useSetStoryStatus(projectId ?? 0)
  const reorderKanban = useReorderKanbanOrder(projectId ?? 0)
  const moveToSprint = useMoveStoryToSprint(projectId ?? 0)

  const [showCreate, setShowCreate] = useState(false)
  const [createStatusId, setCreateStatusId] = useState<number | null>(null)
  const columnEditorOpen = useBoardStore((s) => s.columnEditorOpen)
  const setColumnEditorOpen = useBoardStore((s) => s.setColumnEditorOpen)

  // Closed-marked columns (Done, Archived, or any status with is_closed)
  // must keep rendering their cards — filtering closed stories here is what
  // emptied them seconds after a move, once fresh server data arrived.
  const visible = filterStories(stories ?? [], { ...EMPTY_FILTER, q, showClosed: true }).filter(
    (s) => sprintIds.length === 0 || (s.milestone != null && sprintIds.includes(s.milestone))
  )
  const unknownSprintIds = sprintIds.filter((id) => !milestones.some((m) => m.id === id))
  // Sprint names for the card chips (milestone_name is the fallback).
  const sprintNameById = useMemo(
    () => new Map(milestones.map((m) => [m.id, m.name] as const)),
    [milestones],
  )

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
   * Toolbar rail sprint drop: card onto a sprint or the backlog. Same guard
   * + toast shape as the backlog's move handler; the mutation patches the
   * cache optimistically (see useMoveStoryToSprint).
   */
  function handleMoveToSprint(story: UserStory, milestoneId: number | null) {
    if (story.milestone === milestoneId) return
    const where =
      milestoneId == null
        ? "the backlog"
        : `“${milestones.find((m) => m.id === milestoneId)?.name ?? "sprint"}”`
    moveToSprint.mutate(
      { storyId: story.id, milestoneId, version: story.version },
      {
        onSuccess: () => {
          toast.success(`#${story.ref} moved to ${where}`)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to move story")
        },
      },
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

      {/* The sprint rail in the toolbar owns scope display now; only a stale
          filter (ids matching no loaded sprint) earns an inline notice — and
          scope clears from the sprint picker dropdown, so no button here. */}
      {sprintIds.length > 0 && unknownSprintIds.length === sprintIds.length && !milestonesLoading && (
        <div className="text-muted-foreground border-b px-4 py-1.5 text-sm">
          No matching sprints for this filter ({unknownSprintIds.map((id) => `#${id}`).join(", ")})
          — choose All tasks in the sprint picker.
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
                sprintNames={sprintNameById}
                onMoveStory={handleMoveStory}
                onReorderStory={handleReorderStory}
                onMoveToSprint={handleMoveToSprint}
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
