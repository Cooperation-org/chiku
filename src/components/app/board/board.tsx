import { DragDropProvider } from "@dnd-kit/react"
import { BoardColumn } from "./column"
import type { UserStory, UserStoryStatus } from "@/lib/api/types"

interface BoardProps {
  statuses: UserStoryStatus[]
  stories: UserStory[]
  onMoveStory: (story: UserStory, newStatusId: number) => void
  onSelect: (story: UserStory) => void
  onAddToColumn: (statusId: number) => void
}

export function Board({ statuses, stories, onMoveStory, onSelect, onAddToColumn }: BoardProps) {
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
      <div className="flex gap-4 overflow-x-auto p-4">
        {sorted.map((status) => (
          <BoardColumn
            key={status.id}
            status={status}
            stories={storiesByStatus[status.id] || []}
            onSelect={onSelect}
            onAdd={() => onAddToColumn(status.id)}
          />
        ))}
      </div>
    </DragDropProvider>
  )
}
