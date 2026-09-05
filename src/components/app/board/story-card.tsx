import { useDraggable } from "@dnd-kit/react"
import { Avatar } from "@/components/app/avatar"
import type { UserStory } from "@/lib/api/types"

function formatDueDate(dateStr: string | null): { text: string; className: string } | null {
  if (!dateStr) return null
  const due = new Date(dateStr + "T00:00:00")
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const month = due.toLocaleString("en", { month: "short" })
  const text = `${month} ${due.getDate()}`
  if (diffDays < 0) return { text, className: "text-destructive" }
  if (diffDays <= 3) return { text, className: "text-amber-500" }
  return { text, className: "text-muted-foreground" }
}

export function StoryCard({ story, onSelect }: { story: UserStory; onSelect: (story: UserStory) => void }) {
  const { ref, isDragging } = useDraggable({
    id: story.id,
    data: { story },
  })
  const dueInfo = formatDueDate(story.due_date)

  return (
    <div
      ref={ref}
      onClick={() => onSelect(story)}
      className={`bg-card hover:bg-accent/40 group cursor-pointer rounded-lg border p-3 shadow-xs transition-colors ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {story.epics && story.epics.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {story.epics.map((epic) => (
            <span
              key={epic.id}
              className="rounded px-1.5 py-0.5 text-xs"
              style={{ backgroundColor: `${epic.color}20`, color: epic.color }}
            >
              {epic.subject}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2">
        <span className="text-muted-foreground shrink-0 font-mono text-xs">#{story.ref}</span>
        <h4 className="line-clamp-2 text-sm leading-snug">{story.subject}</h4>
      </div>

      {story.tags && story.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {story.tags.slice(0, 3).map(([tag, color]) => (
            <span
              key={tag}
              className="bg-accent text-muted-foreground rounded px-1.5 py-0.5 text-xs"
              style={color ? { backgroundColor: `${color}30`, color } : undefined}
            >
              {tag}
            </span>
          ))}
          {story.tags.length > 3 && (
            <span className="text-muted-foreground px-1.5 py-0.5 text-xs">+{story.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t pt-2">
        <div className="flex items-center gap-2">
          {story.total_points !== null && story.total_points !== undefined && (
            <span className="text-primary text-xs font-medium">{story.total_points} pts</span>
          )}
          {dueInfo && <span className={`text-[10px] ${dueInfo.className}`}>{dueInfo.text}</span>}
        </div>
        {story.assigned_to_extra_info ? (
          <Avatar
            name={story.assigned_to_extra_info.full_name_display}
            photo={story.assigned_to_extra_info.photo}
            size="sm"
            className="text-white"
          />
        ) : (
          <div className="bg-accent text-muted-foreground/50 flex h-6 w-6 items-center justify-center rounded-full text-xs opacity-0 transition-opacity group-hover:opacity-100">
            +
          </div>
        )}
      </div>
    </div>
  )
}
