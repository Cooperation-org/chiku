import { useMemo, useState } from "react"
import type { ProjectIssueStats } from "@/lib/api/types"
import { IssueDistributionChart } from "@/components/stats/issue-distribution-chart"
import { IssueActivityChart } from "@/components/stats/activity-chart"

type Dimension = "status" | "priority" | "severity" | "type"

const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "severity", label: "Severity" },
  { key: "type", label: "Type" },
]

const CARD_TITLE = "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"

function binsOf(stats: ProjectIssueStats, key: Dimension) {
  const map =
    key === "status"
      ? stats.issues_per_status
      : key === "priority"
        ? stats.issues_per_priority
        : key === "severity"
          ? stats.issues_per_severity
          : stats.issues_per_type
  return Object.values(map).sort((a, b) => a.id - b.id)
}

/** Issue distribution: totals + per-dimension horizontal bars. */
export function IssueDistributionCard({ stats }: { stats: ProjectIssueStats }) {
  const [dimension, setDimension] = useState<Dimension>("status")
  const rows = useMemo(() => binsOf(stats, dimension), [stats, dimension])

  return (
    <section className="flex h-full flex-col rounded-lg border bg-card transition-colors hover:border-ring/40">
      <div className="flex items-start justify-between gap-3 border-b p-4">
        <div className="space-y-1">
          <h2 className={CARD_TITLE}>Issue distribution</h2>
          <p className="text-muted-foreground text-xs tabular-nums">
            {stats.total_issues} issues · {stats.opened_issues} open ·{" "}
            {stats.closed_issues} closed
          </p>
        </div>
        <div className="flex flex-col items-end gap-1" role="tablist" aria-label="Distribution dimension">
          {DIMENSIONS.map((d) => (
            <button
              key={d.key}
              type="button"
              role="tab"
              aria-selected={dimension === d.key}
              onClick={() => setDimension(d.key)}
              className={
                "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors " +
                (dimension === d.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground")
              }
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        <IssueDistributionChart rows={rows} label={dimension} />
      </div>
    </section>
  )
}

/** Issue activity: opened vs closed per day over the 28-day window. */
export function IssueActivityCard({ stats }: { stats: ProjectIssueStats }) {
  const weeks = stats.last_four_weeks_days
  return (
    <section className="rounded-lg border bg-card transition-colors hover:border-ring/40">
      <div className="flex items-center justify-between border-b p-4">
        <div className="space-y-1">
          <h2 className={CARD_TITLE}>Issue activity</h2>
          <p className="text-muted-foreground text-xs">
            Opened vs closed per day, last four weeks
          </p>
        </div>
      </div>
      <div className="p-4">
        <IssueActivityChart open={weeks.by_open_closed.open} closed={weeks.by_open_closed.closed} />
      </div>
    </section>
  )
}
