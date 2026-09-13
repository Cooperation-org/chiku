import { DragDropProvider, DragOverlay, KeyboardSensor, PointerSensor } from "@dnd-kit/react"
import { PointerActivationConstraints } from "@dnd-kit/dom"
import { Plus } from "lucide-react"
import { BoardColumn } from "./board-column"
import { StoryCardView } from "./board-card"
import { Button } from "@/components/ui/button"
import type { UserStory, UserStoryStatus } from "@/lib/api/types"

// Drags only start after the pointer moved 8px (community norm): plain
// clicks — and their inevitable 1–3px of jitter — navigate normally instead
// of being swallowed as micro-drags. KeyboardSensor is listed explicitly
// because passing `sensors` replaces the library defaults. Module scope, so
// the config is created once and no hooks are involved.
const boardSensors = [
  PointerSensor.configure({
    activationConstraints: [new PointerActivationConstraints.Distance({ value: 8 })],
  }),
  KeyboardSensor,
]

interface BoardProps {
  statuses: UserStoryStatus[]
  stories: UserStory[]
  onMoveStory: (story: UserStory, newStatusId: number) => void
  /** In-column reorder: story under another card (or null = column end). */
  onReorderStory: (storyId: number, overId: number | null, statusId: number) => void
  onSelect: (story: UserStory) => void
  onAddToColumn: (statusId: number) => void
  onNewList: () => void
}

export function Board({
  statuses,
  stories,
  onMoveStory,
  onReorderStory,
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
    <DragDropProvider
      sensors={boardSensors}
      onDragEnd={(event) => {
        const { source, target } = event.operation
        if (!source || !target) return
        const story: UserStory | undefined = source.data?.story
        const statusId: number | undefined = target.data?.statusId
        if (!story || statusId === undefined) return
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
              <StoryCardView story={story} />
            </div>
          )
        }}
      </DragOverlay>
    </DragDropProvider>
  )
}
