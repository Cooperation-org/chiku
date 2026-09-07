import { motion, useReducedMotion } from "motion/react"
import { useProjectStats } from "@/lib/queries/projects"
import { useMilestones } from "@/lib/queries/milestones"
import { useProjectIssueStats } from "@/lib/queries/stats"
import { useProjectBySlug } from "@/lib/queries/projects"
import { BurndownCard } from "@/components/stats/burndown-card"
import {
  IssueActivityCard,
  IssueDistributionCard,
} from "@/components/stats/issue-stats-cards"
import {
  PagePresence,
  PageTransition,
} from "@/components/layout/page-transition"
import { PageLoading } from "@/components/layout/page-state"
import { PAGE_EASE_OUT } from "@/lib/motion"

/**
 * Editorial report style: oversized tabular figures separated by hairlines
 * (open composition — no boxes), staggered entrance, micro progress rules,
 * and an asymmetric instrument grid. The one page where the project's
 * numbers are the hero; identity stays in the toolbar.
 */

const FIGURE_LABEL = "text-muted-foreground text-[11px] font-medium uppercase tracking-[0.16em]"
const FIGURE_VALUE = "text-4xl font-semibold tracking-tight tabular-nums xl:text-5xl"
const FIGURE_SUB = "text-muted-foreground text-xs tabular-nums"

function StatFigure({
  index,
  label,
  value,
  sub,
  barColor,
  progress,
}: {
  index: number
  label: string
  value: string
  sub?: string
  barColor?: string
  /** 0–100 — renders the animated hairline progress when set. */
  progress?: number
}) {
  const reduce = useReducedMotion()
  const width = `${Math.min(100, Math.max(0, progress ?? 0))}%`
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(10px)" }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, transform: "translateY(0px)" }}
      transition={
        reduce
          ? { duration: 0.15, ease: "easeOut" }
          : { duration: 0.4, ease: PAGE_EASE_OUT, delay: index * 0.07 }
      }
      className="flex min-w-0 flex-col gap-1.5 lg:border-l lg:pl-6 lg:first:border-l-0 lg:first:pl-0"
    >
      <span className={FIGURE_LABEL}>{label}</span>
      <span className={FIGURE_VALUE}>{value}</span>
      {progress != null && (
        <span className="bg-muted mt-1 block h-1 w-full max-w-36 overflow-hidden rounded-full">
          <motion.span
            initial={reduce ? undefined : { width: 0 }}
            animate={{ width }}
            transition={
              reduce
                ? undefined
                : { duration: 0.7, ease: PAGE_EASE_OUT, delay: 0.25 + index * 0.07 }
            }
            style={
              reduce
                ? { display: "block", height: "100%", width }
                : { display: "block", height: "100%" }
            }
            className={barColor ?? "bg-foreground"}
          />
        </span>
      )}
      {sub && <span className={FIGURE_SUB}>{sub}</span>}
    </motion.div>
  )
}

/** Project stats & analytics: hero figures, sprint burndown, issue analytics. */
export default function StatsPage({ slug }: { slug: string }) {
  const { project, isLoading } = useProjectBySlug(slug)
  const projectId = project?.id ?? null
  const { data: stats } = useProjectStats(projectId)
  const { data: milestones } = useMilestones(projectId)
  const { data: issueStats } = useProjectIssueStats(projectId)

  if (isLoading) {
    return <PageLoading label="Loading project" />
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Select a project to view stats</div>
      </div>
    )
  }

  const closedPct =
    stats && stats.defined_points > 0
      ? Math.round((stats.closed_points / stats.defined_points) * 100)
      : 0
  const assignedPct =
    stats && stats.defined_points > 0
      ? Math.round((stats.assigned_points / stats.defined_points) * 100)
      : 0
  const completedSprints = milestones?.filter((m) => m.closed).length ?? 0

  return (
    <div className="h-full overflow-y-auto">
      <PagePresence>
        {stats ? (
          <PageTransition key="content">
            <div className="mx-auto max-w-5xl px-6 py-6">
              {/* Masthead — report kicker; identity lives in the toolbar. */}
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.2em]">
                  Analytics
                </span>
                <span className="bg-border h-px flex-1" />
                <span className="text-muted-foreground text-[11px] tabular-nums">
                  {project.name}
                </span>
              </div>

              {/* Hero figures — open composition, hairline-ruled columns. */}
              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
                <StatFigure
                  index={0}
                  label="Closed"
                  value={String(stats.closed_points)}
                  barColor="bg-emerald-500"
                  progress={closedPct}
                  sub={`of ${stats.defined_points} defined points`}
                />
                <StatFigure
                  index={1}
                  label="Assigned"
                  value={String(stats.assigned_points)}
                  progress={assignedPct}
                  sub="claimed by stories"
                />
                <StatFigure
                  index={2}
                  label="Speed"
                  value={String(stats.speed)}
                  sub="points per day"
                />
                <StatFigure
                  index={3}
                  label="Sprints"
                  value={String(stats.total_milestones)}
                  sub={completedSprints > 0 ? `${completedSprints} completed` : "none completed yet"}
                />
              </div>

              {/* Instrument cards — burndown takes the wide lane, distribution
                  rides the narrow rail; activity runs full width below. */}
              <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <BurndownCard milestones={milestones ?? []} />
                </div>
                {project.is_issues_activated !== false && issueStats && (
                  <div className="lg:col-span-5">
                    <IssueDistributionCard stats={issueStats} />
                  </div>
                )}
                {project.is_issues_activated !== false && issueStats && (
                  <div className="lg:col-span-12">
                    <IssueActivityCard stats={issueStats} />
                  </div>
                )}
              </div>
            </div>
          </PageTransition>
        ) : (
          <PageLoading key="pending" label="Loading stats" />
        )}
      </PagePresence>
    </div>
  )
}
