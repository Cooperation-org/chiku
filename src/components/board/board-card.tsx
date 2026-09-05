import { useDraggable } from "@dnd-kit/react"
import { Avatar } from "@/components/app/avatar"
import { useBoardStore } from "@/lib/stores/board"
import type { UserStory } from "@/lib/api/types"

export function BoardCard({ story, onSelect }: { story: UserStory; onSelect: (story: UserStory) => void }) {
  const { ref, isDragging } = useDraggable({ id: story.id, data: { story } })
  const showLabels = useBoardStore((s) => s.showLabels)

  return (
    <div
      ref={ref}
      onClick={() => onSelect(story)}
      className={`group bg-card hover:bg-accent/60 relative cursor-grab rounded-lg border p-3 shadow-xs transition-colors active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <h4 className="mr-6 line-clamp-2 text-sm leading-snug font-medium">{story.subject}</h4>

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
