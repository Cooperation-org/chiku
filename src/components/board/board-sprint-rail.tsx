import { useDragOperation, useDroppable } from "@dnd-kit/react"
import { motion } from "motion/react"
import { Inbox } from "lucide-react"
import { cn } from "cn"
import { useSprintScope } from "@/components/sprints/use-sprint-scope"
import { SprintCountdownBadge } from "@/components/sprints/sprint-countdown-badge"
import { rolloverTarget, unfinishedStories } from "@/lib/sprints"
import type { UserStory } from "@/lib/api/types"

/** Same pop physics as the rest of the toolbar. */
const railSpring = { type: "spring", stiffness: 500, damping: 38 } as const

/**
 * Board sprint rail, hosted in the toolbar center via route staticData.
 * Idle it shows the selected sprints with their countdowns (replacing the
 * old in-page banner); while a card is held the open sprints plus the
 * backlog expand into drop targets on the app-wide drag session (owned by
 * AppShell, consumed here via hooks — no provider of its own).
 *
 * All droppables stay mounted for the life of the rail and only CSS
 * visibility toggles: registering/unregistering drop targets mid-drag
 * wedges the manager's operation (no second drag until refresh), so the
 * tree here never swaps on drag state — only classes change.
 */
export function BoardSprintRail() {
  return <RailContent />
}
BoardSprintRail.displayName = "BoardSprintRail"

function RailContent() {
  const { milestones, stories, known, open } = useSprintScope()
  const { source } = useDragOperation()
  const dragging = (source?.data?.story as UserStory | undefined) != null
  // Sprints already shown as idle chips must not repeat in the drop list.
  const knownIds = new Set(known.map((s) => s.id))
  const extra = open.filter((s) => !knownIds.has(s.id))

  return (
    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden" aria-label="Sprint rail">
      {known.map((sprint, i) => (
        <SprintTarget
          key={sprint.id}
          milestoneId={sprint.id}
          index={i}
          title={
            dragging ? `Move to ${sprint.name}` : `${sprint.name} — scoped on the board`
          }
        >
          <span className="max-w-28 truncate text-xs font-medium">{sprint.name}</span>
          <SprintCountdownBadge
            sprint={sprint}
            unfinishedCount={unfinishedStories(stories, sprint.id).length}
            rolloverName={rolloverTarget(milestones, sprint.id)?.name}
          />
        </SprintTarget>
      ))}
      {/* Extra drop targets: mounted always (see note above), expanded by CSS
          while dragging. Zero-size + pointer-events-none when collapsed so
          they can never collide or intercept while idle. */}
      <div
        className={cn(
          "flex min-w-0 items-center gap-1.5 overflow-hidden transition-all duration-150",
          dragging ? "max-w-xl opacity-100" : "max-w-0 opacity-0",
        )}
        aria-hidden={!dragging}
      >
        {extra.map((sprint, i) => (
          <SprintTarget
            key={sprint.id}
            milestoneId={sprint.id}
            index={known.length + i}
            title={`Move to ${sprint.name}`}
            inert={!dragging}
          >
            <span className="max-w-24 truncate text-xs font-medium">{sprint.name}</span>
          </SprintTarget>
        ))}
        <SprintTarget
          milestoneId={null}
          index={known.length + extra.length}
          title="Move to the backlog"
          inert={!dragging}
        >
          <Inbox className="size-3.5 shrink-0" />
          <span className="text-xs font-medium">Backlog</span>
        </SprintTarget>
        <span className="text-muted-foreground hidden shrink-0 text-[11px] whitespace-nowrap xl:inline">
          drop to move
        </span>
      </div>
    </div>
  )
}

function SprintTarget({
  milestoneId,
  index,
  title,
  inert,
  children,
}: {
  milestoneId: number | null
  index: number
  title: string
  /** Collapsed (idle) extra target: no pointer interaction. */
  inert?: boolean
  children: React.ReactNode
}) {
  const { ref, isDropTarget } = useDroppable({
    id: milestoneId == null ? "sprint-backlog" : `sprint-${milestoneId}`,
    data: { milestoneId },
  })
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...railSpring, delay: Math.min(index, 5) * 0.02 }}
      className="flex min-w-0 items-center"
    >
      <div
        ref={ref}
        title={title}
        className={cn(
          "inline-flex h-7 max-w-44 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 whitespace-nowrap transition-colors",
          isDropTarget
            ? "border-primary bg-primary/15 ring-primary ring-2"
            : "border-primary/50 bg-primary/5 hover:bg-primary/10",
          inert && "pointer-events-none",
        )}
      >
        {children}
      </div>
    </motion.div>
  )
}
