import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useMilestoneStats } from "@/lib/queries/stats"
import type { Milestone } from "@/lib/api/types"
import { BurndownChart } from "@/components/stats/burndown-chart"
import {
  Select,
  SelectContent,
  SelectItem,
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
  const current = ordered.find((m) => !m.closed) ?? ordered.at(-1) ?? null
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const active = ordered.find((m) => m.id === selectedId) ?? current
  const activeId = active?.id ?? null
  const { data: stats, isPending } = useMilestoneStats(activeId)

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-3 border-b p-4">
        <div className="space-y-1">
          <h2 className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.16em]">
            Sprint burndown
          </h2>
          <p className="text-muted-foreground text-xs">
            Remaining points against the ideal slope
          </p>
        </div>
        {ordered.length > 0 && (
          <Select value={activeId != null ? String(activeId) : undefined} onValueChange={(v) => {
            if (v !== null) setSelectedId(Number(v))
          }}>
            <SelectTrigger size="sm" className="max-w-56">
              <SelectValue placeholder="Pick a sprint" />
            </SelectTrigger>
            <SelectContent>
              {ordered.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name}
                </SelectItem>
              ))}
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
          <BurndownChart stats={stats} />
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
