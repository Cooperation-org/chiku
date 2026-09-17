import type { StoryStatusRow, StorySummary } from "@/lib/story-stats"
import { StoryDistributionChart } from "@/components/stats/story-distribution-chart"
import { StoryActivityChart } from "@/components/stats/story-activity-chart"

const CARD_TITLE = "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"

/** Story distribution: totals + per-status horizontal bars (board columns). */
export function StoryDistributionCard({
  rows,
  summary,
}: {
  rows: StoryStatusRow[]
  summary: StorySummary
}) {
  if (summary.total === 0) {
    return (
      <section className="flex h-full flex-col rounded-lg border bg-card transition-colors hover:border-ring/40">
        <div className="border-b p-4">
          <h2 className={CARD_TITLE}>Story distribution</h2>
        </div>
        <p className="text-muted-foreground p-6 text-center text-sm">
          No stories yet. Create one from the board to see the distribution.
        </p>
      </section>
    )
  }

  return (
    <section className="flex h-full flex-col rounded-lg border bg-card transition-colors hover:border-ring/40">
      <div className="border-b p-4">
        <h2 className={CARD_TITLE}>Story distribution</h2>
        <p className="text-muted-foreground text-xs tabular-nums">
          {summary.total} stories · {summary.open} open · {summary.closed}{" "}
          closed · {summary.totalPoints} points
        </p>
      </div>
      <div className="p-4">
        <StoryDistributionChart rows={rows} />
        <p className="text-muted-foreground mt-2 text-xs tabular-nums">
          {summary.backlog} in backlog · {summary.inSprint} in sprints
          {summary.blocked > 0 && <> · {summary.blocked} blocked</>}
        </p>
      </div>
    </section>
  )
}

/** Story activity: created vs completed per day over the 28-day window. */
export function StoryActivityCard({
  open,
  closed,
}: {
  open: number[]
  closed: number[]
}) {
  return (
    <section className="rounded-lg border bg-card transition-colors hover:border-ring/40">
      <div className="border-b p-4">
        <h2 className={CARD_TITLE}>Story activity</h2>
        <p className="text-muted-foreground text-xs">
          Created vs completed per day, last four weeks
        </p>
      </div>
      <div className="p-4">
        <StoryActivityChart open={open} closed={closed} />
        <p className="text-muted-foreground mt-2 text-xs">
          Completed counts modified dates of closed stories — an approximation,
          since Taiga exposes no dedicated closed date on the story list.
        </p>
      </div>
    </section>
  )
}
