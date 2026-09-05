import { useDroppable } from "@dnd-kit/react"
import { Plus } from "lucide-react"
import { StoryCard } from "./story-card"
import type { UserStory, UserStoryStatus } from "@/lib/api/types"

interface ColumnProps {
  status: UserStoryStatus
  stories: UserStory[]
  onSelect: (story: UserStory) => void
  onAdd: () => void
}

export function BoardColumn({ status, stories, onSelect, onAdd }: ColumnProps) {
  const { ref, isDropTarget } = useDroppable({
    id: `column-${status.id}`,
    data: { statusId: status.id },
  })

  const totalPoints = stories.reduce((sum, s) => sum + (s.total_points || 0), 0)

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color || "#666" }} />
          <h3 className="text-sm font-medium">{status.name}</h3>
          <span className="text-muted-foreground text-xs">{stories.length}</span>
        </div>
        <span className="text-muted-foreground text-xs">{totalPoints} pts</span>
      </div>

      <div
        ref={ref}
        className={`min-h-[100px] flex-1 space-y-2 overflow-y-auto rounded-lg p-1 transition-colors max-h-[calc(100vh-220px)] ${
          isDropTarget ? "bg-primary/5 ring-1 ring-primary/30 ring-dashed" : ""
        }`}
      >
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} onSelect={onSelect} />
        ))}
      </div>

      <button
        onClick={onAdd}
        className="text-muted-foreground hover:bg-accent hover:text-foreground mt-2 flex w-full items-center justify-center gap-1 rounded-md p-2 text-sm transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add story
      </button>
    </div>
  )
}
