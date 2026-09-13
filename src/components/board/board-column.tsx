import { useDroppable } from "@dnd-kit/react"
import { ChevronRight, Plus } from "lucide-react"
import { BoardCard } from "./board-card"
import { useBoardStore } from "@/lib/stores/board"
import type { UserStory, UserStoryStatus } from "@/lib/api/types"

interface BoardColumnProps {
  status: UserStoryStatus
  stories: UserStory[]
  onSelect: (story: UserStory) => void
  onAdd: () => void
}

export function BoardColumn({ status, stories, onSelect, onAdd }: BoardColumnProps) {
  const { ref, isDropTarget } = useDroppable({
    id: `column-${status.id}`,
    data: { statusId: status.id },
  })
  const collapsed = useBoardStore((s) => s.collapsedColumns.includes(status.id))
  const toggleColumn = useBoardStore((s) => s.toggleColumn)

  // Collapsed: the full-height icon rail with the rotated title, GitLab style.
  if (collapsed) {
    return (
      <div className="flex w-10 shrink-0 flex-col">
        <div
          className="bg-muted/50 hover:bg-muted/70 border-border flex h-full cursor-pointer flex-col items-center gap-3 rounded-lg border border-t-4 py-2 transition-colors"
          style={{ borderTopColor: status.color || "#666" }}
          onClick={() => toggleColumn(status.id)}
          title={`Expand ${status.name}`}
        >
          <button
            className="text-muted-foreground hover:text-foreground rounded p-1"
            onClick={(e) => {
              e.stopPropagation()
              toggleColumn(status.id)
            }}
            aria-label={`Expand ${status.name}`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span
            className="text-muted-foreground max-h-40 truncate text-sm font-medium"
            style={{ writingMode: "vertical-rl" }}
          >
            {status.name}
          </span>
          <span className="text-muted-foreground mt-auto inline-flex items-center gap-1 pb-1 text-xs">
            <span
              className="inline-block h-3 w-3 rounded-sm border border-current opacity-70"
              aria-hidden
              style={{ writingMode: "horizontal-tb" }}
            />
            {stories.length}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex max-h-full w-72 shrink-0 flex-col">
      <div
        ref={ref}
        className={`bg-muted/40 border-border flex h-full min-h-0 flex-col overflow-hidden rounded-lg border transition-shadow ${
          isDropTarget ? "bg-primary/10 ring-primary/50 ring-2" : ""
        }`}
      >
        {/* Colored top strip — the status colour, GitLab label-list style */}
        <div className="border-b-0 border-t-4" style={{ borderTopColor: status.color || "#666" }}>
          <header className="flex h-9 items-center gap-1 px-2">
            <button
              className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1 transition-colors"
              onClick={() => toggleColumn(status.id)}
              aria-label={`Collapse ${status.name}`}
              title="Collapse"
            >
              <ChevronRight className="h-4 w-4 -rotate-90 transition-transform" />
            </button>
            <span
              className="min-w-0 flex-1 truncate rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: `${status.color || "#666"}26`,
                color: status.color || "#666",
              }}
              title={status.name}
            >
              {status.name}
            </span>
            <span
              className="text-muted-foreground inline-flex shrink-0 items-center gap-1 pr-1 text-xs font-bold"
              title={`${stories.length} stories`}
            >
              <span className="inline-block h-3 w-3 rounded-sm border border-current opacity-70" aria-hidden />
              {stories.length}
            </span>
            <button
              className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1 transition-colors"
              onClick={onAdd}
              aria-label={`Add story to ${status.name}`}
              title="Add story"
            >
              <Plus className="h-4 w-4" />
            </button>
          </header>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
          {stories.map((story) => (
            <BoardCard key={story.id} story={story} onSelect={onSelect} />
          ))}
          {stories.length === 0 && (
            <div className="text-muted-foreground/60 py-6 text-center text-xs">No stories</div>
          )}
        </div>
      </div>
    </div>
  )
}
