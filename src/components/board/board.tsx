import { DragDropProvider, DragOverlay } from "@dnd-kit/react"
import { Plus } from "lucide-react"
import { BoardColumn } from "./board-column"
import { StoryCardView } from "./board-card"
import { Button } from "@/components/ui/button"
import { boardDragManager } from "@/lib/dnd/board-dnd"
import type { UserStory, UserStoryStatus } from "@/lib/api/types"

interface BoardProps {
  statuses: UserStoryStatus[]
  stories: UserStory[]
  /** Sprint id → name for the card chips (milestone_name is the fallback). */
  sprintNames?: Map<number, string>
  onMoveStory: (story: UserStory, newStatusId: number) => void
  /** In-column reorder: story under another card (or null = column end). */
  onReorderStory: (storyId: number, overId: number | null, statusId: number) => void
  /** Sprint drop (toolbar rail targets): card onto a sprint or the backlog. */
  onMoveToSprint?: (story: UserStory, milestoneId: number | null) => void
  onSelect: (story: UserStory) => void
  onAddToColumn: (statusId: number) => void
  onNewList: () => void
}

export function Board({
  statuses,
  stories,
  sprintNames,
  onMoveStory,
  onReorderStory,
  onMoveToSprint,
  onSelect,
  onAddToColumn,
  onNewList,
}: BoardProps) {
  const sorted = [...statuses].sort((a, b) => a.order - b.order)
  // Columns render in persisted kanban_order — never in fetch order. The
  // list endpoint returns modified-date order, so without this the board
  // reverts visually on every refetch even when the server saved correctly.
  const storiesByStatus = sorted.reduce((acc, status) => {
    acc[status.id] = stories
      .filter((s) => s.status === status.id)
      .sort((a, b) => a.kanban_order - b.kanban_order)
    return acc
  }, {} as Record<number, UserStory[]>)

  return (
    // Same drag session as the toolbar sprint rail (shared manager): rail
    // targets carry `milestoneId`, columns/cards carry `statusId`.
    <DragDropProvider
      manager={boardDragManager}
      onDragEnd={(event) => {
        const { source, target } = event.operation
        if (!source || !target) return
        const story: UserStory | undefined = source.data?.story
        if (!story) return
        const milestoneId: number | null | undefined = target.data?.milestoneId
        if (milestoneId !== undefined) {
          onMoveToSprint?.(story, milestoneId)
          return
        }
        const statusId: number | undefined = target.data?.statusId
        if (statusId === undefined) return
        if (story.status !== statusId) {
          onMoveStory(story, statusId)
          return
        }
        // Same-column drop: reorder. Dropping onto another card inserts the
        // dragged card before it; dropping on empty column space appends.
        const overId: number | undefined = target.data?.storyId
        if (overId == null || overId !== story.id) {
          onReorderStory(story.id, overId ?? null, statusId)
        }
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto px-3 pt-3 pb-4">
          {sorted.map((status) => (
            <BoardColumn
              key={status.id}
              status={status}
              stories={storiesByStatus[status.id] || []}
              sprintNames={sprintNames}
              onSelect={onSelect}
              onAdd={() => onAddToColumn(status.id)}
            />
          ))}
          <div className="flex shrink-0 items-start py-1">
            <Button variant="outline" size="sm" onClick={onNewList} className="gap-1.5">
              <Plus className="h-4 w-4" />
              New list
            </Button>
          </div>
        </div>
      </div>
      <DragOverlay>
        {(source) => {
          const story: UserStory | undefined = source?.data?.story
          if (!story) return null
          return (
            <div className="pointer-events-none w-72 rotate-2 shadow-xl">
              <StoryCardView story={story} sprintNames={sprintNames} />
            </div>
          )
        }}
      </DragOverlay>
    </DragDropProvider>
  )
}
