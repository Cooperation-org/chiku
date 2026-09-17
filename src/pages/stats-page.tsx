import { useMemo } from "react"
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
import {
  StoryActivityCard,
  StoryDistributionCard,
} from "@/components/stats/story-stats-cards"
import { Skeleton } from "@/components/ui/skeleton"
import { useMilestones } from "@/lib/queries/milestones"
import { useProjectBySlug, useProjectStats } from "@/lib/queries/projects"
import { useProjectIssueStats } from "@/lib/queries/stats"
import { useStatuses, useStories } from "@/lib/queries/stories"
import {
  bucketStoryActivity,
  groupStoriesByStatus,
  summarizeStories,
} from "@/lib/story-stats"

/**
 * Editorial report style: oversized tabular figures separated by hairlines
 * (open composition — no boxes), staggered entrance, micro progress rules,
 * and an asymmetric instrument grid. The one page where the project's
 * numbers are the hero; identity stays in the toolbar.
 */

/** Project stats & analytics: hero figures, sprint burndown, story analytics, issue analytics. */
export default function StatsPage({ slug }: { slug: string }) {
  const { project, isLoading } = useProjectBySlug(slug)
  const projectId = project?.id ?? null
  const { data: stats } = useProjectStats(projectId)
  const { data: milestones } = useMilestones(projectId)
  const { data: stories } = useStories(projectId)
  const { data: statuses } = useStatuses(projectId)
  const { data: issueStats } = useProjectIssueStats(projectId)

  const storyRows = useMemo(
    () => groupStoriesByStatus(stories ?? [], statuses ?? []),
    [stories, statuses],
  )
  const storySummary = useMemo(() => summarizeStories(stories ?? []), [stories])
  const storyActivity = useMemo(() => bucketStoryActivity(stories ?? []), [stories])
  const storiesReady = stories != null && statuses != null

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
  // Issues are a separate tracker from stories — show their cards only when
  // the module is on and actually holds data, never as a story fallback.
  const showIssues =
    project.is_issues_activated !== false &&
    issueStats != null &&
    issueStats.total_issues > 0

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

              {/* Instrument cards — burndown takes the wide lane, story
                  distribution rides the narrow rail; story activity runs
                  full width below. Issues are a separate section. */}
              <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <BurndownCard milestones={milestones ?? []} slug={slug} />
                </div>
                <div className="lg:col-span-5">
                  {storiesReady ? (
                    <StoryDistributionCard rows={storyRows} summary={storySummary} />
                  ) : (
                    <Skeleton className="h-[260px] rounded-lg" />
                  )}
                </div>
                <div className="lg:col-span-12">
                  {storiesReady ? (
                    <StoryActivityCard open={storyActivity.open} closed={storyActivity.closed} />
                  ) : (
                    <Skeleton className="h-[300px] rounded-lg" />
                  )}
                </div>
                {showIssues && issueStats && (
                  <div className="lg:col-span-12">
                    <p className="text-muted-foreground mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
                      Issues — separate tracker
                    </p>
                  </div>
                )}
                {showIssues && issueStats && (
                  <div className="lg:col-span-12">
                    <IssueDistributionCard stats={issueStats} />
                  </div>
                )}
                {showIssues && issueStats && (
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
