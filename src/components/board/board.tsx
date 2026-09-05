import { DragDropProvider } from "@dnd-kit/react"
import { Plus } from "lucide-react"
import { BoardColumn } from "./board-column"
import { Button } from "@/components/ui/button"
import type { UserStory, UserStoryStatus } from "@/lib/api/types"

interface BoardProps {
  statuses: UserStoryStatus[]
  stories: UserStory[]
  onMoveStory: (story: UserStory, newStatusId: number) => void
  onSelect: (story: UserStory) => void
  onAddToColumn: (statusId: number) => void
  onEditColumns: () => void
  onNewList: () => void
}

export function Board({
  statuses,
  stories,
  onMoveStory,
  onSelect,
  onAddToColumn,
  onEditColumns,
  onNewList,
}: BoardProps) {
  const sorted = [...statuses].sort((a, b) => a.order - b.order)
  const storiesByStatus = sorted.reduce((acc, status) => {
    acc[status.id] = stories.filter((s) => s.status === status.id)
    return acc
  }, {} as Record<number, UserStory[]>)

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        const { source, target } = event.operation
        if (!source || !target) return
        const story: UserStory | undefined = source.data?.story
        const statusId: number | undefined = target.data?.statusId
        if (!story || statusId === undefined) return
        if (story.status === statusId) return
        onMoveStory(story, statusId)
      }}
    >
      <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto p-3">
        {sorted.map((status) => (
          <BoardColumn
            key={status.id}
            status={status}
            stories={storiesByStatus[status.id] || []}
            onSelect={onSelect}
            onAdd={() => onAddToColumn(status.id)}
            onEditColumns={onEditColumns}
          />
        ))}
        <div className="flex shrink-0 items-start py-1">
          <Button variant="outline" size="sm" onClick={onNewList} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New list
          </Button>
        </div>
      </div>
    </DragDropProvider>
  )
}
