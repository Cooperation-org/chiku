import { useDraggable, useDroppable, useDragOperation } from "@dnd-kit/react"
import { OctagonAlert } from "lucide-react"
import { Avatar } from "@/components/app/avatar"
import { useBoardStore } from "@/lib/stores/board"
import type { UserStory } from "@/lib/api/types"

/**
 * Pure card visual — no drag hooks, so it is safe to mount inside the
 * DragOverlay (which would otherwise double-register the same draggable id).
 */
export function StoryCardView({ story, onClick }: { story: UserStory; onClick?: () => void }) {
  const showLabels = useBoardStore((s) => s.showLabels)

  return (
    <div
      onClick={onClick}
      className="group bg-card hover:bg-accent/60 relative cursor-grab rounded-lg border p-3 shadow-xs transition-colors active:cursor-grabbing"
    >
      <h4 className="mr-6 line-clamp-2 text-sm leading-snug font-medium">{story.subject}</h4>

      {story.is_blocked && (
        <div
          className="mt-1.5 inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400"
          title={story.blocked_note || "Blocked"}
        >
          <OctagonAlert className="h-3 w-3" />
          Blocked
        </div>
      )}

      {showLabels && story.tags && story.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {story.tags.map(([tag, color]) => (
            <span
              key={tag}
              className="rounded-full border px-2 py-0.5 text-[11px] leading-4 font-medium"
              style={
                color
                  ? { backgroundColor: `${color}26`, color, borderColor: `${color}59` }
                  : undefined
              }
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
          <span className="inline-block h-3 w-3 rounded-sm border border-current opacity-70" aria-hidden />
          #{story.ref}
        </span>
        {story.assigned_to_extra_info && (
          <Avatar
            name={story.assigned_to_extra_info.full_name_display}
            photo={story.assigned_to_extra_info.photo}
            size="sm"
            className="text-white"
          />
        )}
      </div>
    </div>
  )
}

export function BoardCard({ story, onSelect }: { story: UserStory; onSelect: (story: UserStory) => void }) {
  const { ref: dragRef, isDragging } = useDraggable({ id: story.id, data: { story } })
  // Cards are droppable too (in addition to columns) so a drop onto another
  // card reports the exact insert position for in-column reorders.
  // `isDropTarget` reacts to hover; `source` lets us ignore the dragged card
  // flagging itself — all signal-driven, no component state.
  const { ref: dropRef, isDropTarget } = useDroppable({
    id: `card-${story.id}`,
    data: { storyId: story.id, statusId: story.status },
  })
  const { source } = useDragOperation()
  const showInsertLine = isDropTarget && source?.id !== story.id

  return (
    <>
      {showInsertLine && (
        <div
          aria-hidden
          className="bg-primary h-0.5 shrink-0 rounded-full"
        />
      )}
      <div
        ref={(el) => {
          dragRef(el)
          dropRef(el)
        }}
        className={isDragging ? "opacity-40" : ""}
      >
        <StoryCardView story={story} onClick={() => onSelect(story)} />
      </div>
    </>
  )
}
