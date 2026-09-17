import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useMilestoneStats } from "@/lib/queries/stats"
import type { Milestone, MilestoneStats } from "@/lib/api/types"
import { BurndownChart } from "@/components/stats/burndown-chart"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Sprint burndown with a sprint picker. Defaults to the first open sprint
 * (falls back to the most recent closed one when a project has none). A stale
 * selection (project switch) falls back to the current sprint too.
 */
export function BurndownCard({ milestones, slug }: { milestones: Milestone[]; slug: string }) {
  const ordered = [...milestones].sort((a, b) =>
    a.estimated_start.localeCompare(b.estimated_start),
  )
  const open = ordered.filter((m) => !m.closed)
  const closed = [...ordered].filter((m) => m.closed).reverse()
  const current = open[0] ?? ordered.at(-1) ?? null
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const active = ordered.find((m) => m.id === selectedId) ?? current
  const activeId = active?.id ?? null
  const { data: stats, isPending } = useMilestoneStats(activeId)

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-3 border-b p-4">
        <div className="min-w-0 space-y-1">
          <h2 className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.16em]">
            Sprint burndown
          </h2>
          <p className="text-muted-foreground truncate text-xs" title={active?.name}>
            {active ? `${active.name} · ` : ""}remaining points against the ideal slope
          </p>
        </div>
        {ordered.length > 0 && (
          <Select value={activeId != null ? String(activeId) : undefined} onValueChange={(v) => {
            if (v !== null) setSelectedId(Number(v))
          }}>
            <SelectTrigger
              size="sm"
              className="max-w-56 min-w-0 shrink-0"
              title={active?.name ?? "Pick a sprint"}
            >
              {/* Resolve value → label explicitly: Base UI's Value can fall
                  back to the raw id (e.g. "5") — same convention as
                  TaskSprintSelector, which never shows raw ids. */}
              {active ? (
                <span className="truncate">
                  {active.name}
                  {active.closed ? " (closed)" : ""}
                </span>
              ) : (
                <SelectValue placeholder="Pick a sprint" />
              )}
            </SelectTrigger>
            <SelectContent align="end" className="min-w-56">
              {open.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Open sprints</SelectLabel>
                  {open.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)} title={m.name}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {closed.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Closed</SelectLabel>
                  {closed.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)} title={m.name}>
                      {m.name} (closed)
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {ordered.length === 0 ? (
        <p className="text-muted-foreground p-6 text-center text-sm">
          No sprints yet. Create one to see the burndown.
        </p>
      ) : isPending || !stats ? (
        <Skeleton className="m-4 h-[260px] rounded-lg" />
      ) : (
        <div className="space-y-3 p-4">
          <BurndownLegend />
          <BurndownChart stats={stats} />
          <BurndownSummary stats={stats} />
          <p className="text-muted-foreground text-xs">
            {stats.completed_userstories}/{stats.total_userstories} stories ·{" "}
            {stats.completed_tasks}/{stats.total_tasks} tasks
            {stats.estimated_start && (
              <>
                {" · "}
                {stats.estimated_start} → {stats.estimated_finish}
              </>
            )}
          </p>
          {stats.total_userstories === 0 && stats.total_tasks === 0 && (
            <p className="text-muted-foreground text-xs">
              This sprint is empty — assign stories from the{" "}
              <Link
                to="/projects/$slug/backlog"
                params={{ slug }}
                className="text-foreground underline underline-offset-2"
              >
                backlog
              </Link>{" "}
              to see the burndown move.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

/** Which line is which — the chart itself carries no labels. */
function BurndownLegend() {
  return (
    <div className="text-muted-foreground flex items-center gap-4 text-xs" aria-hidden>
      <span className="inline-flex items-center gap-1.5">
        <span className="bg-primary h-0.5 w-4 rounded" />
        Remaining
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="border-muted-foreground h-0 w-4 border-t-2 border-dashed" />
        Ideal pace
      </span>
    </div>
  )
}

/** One plain-language sentence: where the sprint stands and what it needs. */
function BurndownSummary({ stats }: { stats: MilestoneStats }) {
  const days = stats.days
  const total = days[0]?.optimal_points ?? 0
  const remaining = days.length > 0 ? days[days.length - 1].open_points : 0
  const today = toLocalDay(new Date())
  const daysLeft = days.filter((d) => d.day >= today).length
  const expectedToday =
    [...days].reverse().find((d) => d.day <= today)?.optimal_points ?? total

  let sentence: string
  if (total <= 0) {
    sentence = "No points planned for this sprint yet."
  } else if (remaining <= 0) {
    sentence = `Sprint complete — all ${total} points closed.`
  } else if (daysLeft <= 0) {
    sentence = `Overdue with ${remaining} of ${total} points still open.`
  } else if (remaining <= expectedToday) {
    const pace = (remaining / daysLeft).toFixed(1)
    sentence = `On track — ${remaining} of ${total} points left, about ${pace}/day to finish on time.`
  } else {
    const pace = (remaining / daysLeft).toFixed(1)
    sentence = `Behind pace — ${remaining} of ${total} points left, needs about ${pace}/day over ${daysLeft} ${daysLeft === 1 ? "day" : "days"}.`
  }
  return <p className="text-sm font-medium">{sentence}</p>
}

/** Local YYYY-MM-DD for day-string comparison with the stats payload. */
function toLocalDay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
