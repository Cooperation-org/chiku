import { PageLoading } from "@/components/layout/page-state"
import {
  PagePresence,
  PageTransition,
} from "@/components/layout/page-transition"
import { ReportFigures } from "@/components/layout/report"
import { BurndownCard } from "@/components/stats/burndown-card"
import {
  IssueActivityCard,
  IssueDistributionCard,
} from "@/components/stats/issue-stats-cards"
import { useMilestones } from "@/lib/queries/milestones"
import { useProjectBySlug, useProjectStats } from "@/lib/queries/projects"
import { useProjectIssueStats } from "@/lib/queries/stats"

/**
 * Editorial report style: oversized tabular figures separated by hairlines
 * (open composition — no boxes), staggered entrance, micro progress rules,
 * and an asymmetric instrument grid. The one page where the project's
 * numbers are the hero; identity stays in the toolbar.
 */

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
        <div className="text-muted-foreground">
          Select a project to view stats
        </div>
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
              <ReportFigures
                className="mt-6"
                figures={[
                  {
                    label: "Closed",
                    value: String(stats.closed_points),
                    barColor: "bg-emerald-500",
                    progress: closedPct,
                    sub: `of ${stats.defined_points} defined points`,
                  },
                  {
                    label: "Assigned",
                    value: String(stats.assigned_points),
                    progress: assignedPct,
                    sub: "claimed by stories",
                  },
                  {
                    label: "Speed",
                    value: String(stats.speed),
                    sub: "points per day",
                  },
                  {
                    label: "Sprints",
                    value: String(stats.total_milestones),
                    sub:
                      completedSprints > 0
                        ? `${completedSprints} completed`
                        : "none completed yet",
                  },
                ]}
              />

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
