import { useVelocityData } from "@/lib/queries/milestones"
import { useProjectBySlug } from "@/lib/queries/projects"
import { ModuleDisabled } from "@/components/project/module-disabled"
import {
  PagePresence,
  PageTransition,
} from "@/components/layout/page-transition"
import { PageLoading } from "@/components/layout/page-state"
import {
  REPORT_KICKER,
  ReportFigures,
  ReportMasthead,
} from "@/components/layout/report"
import { viewEnabled } from "@/lib/project-views"

export default function VelocityPage({ slug }: { slug: string }) {
  const { project: currentProject } = useProjectBySlug(slug)
  const { data, isLoading } = useVelocityData(currentProject?.id ?? null)

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">
          Select a project to view velocity
        </div>
      </div>
    )
  }

  if (!viewEnabled(currentProject, "velocity")) {
    return <ModuleDisabled view="Velocity" slug={slug} />
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <ReportMasthead kicker="Velocity" tag={currentProject.name} />
        <PagePresence>
          {isLoading ? (
            <PageLoading key="loading" label="Loading velocity data" />
          ) : !data || data.milestones.length === 0 ? (
            <PageTransition key="empty">
              <div className="flex h-full items-center justify-center">
                <div className="text-muted-foreground">
                  No sprints yet. Create a sprint to track velocity.
                </div>
              </div>
            </PageTransition>
          ) : (
            <PageTransition key="velocity">
              <VelocityContent
                data={data.milestones}
                backlogPoints={data.backlogPoints}
              />
            </PageTransition>
          )}
        </PagePresence>
      </div>
    </div>
  )
}

function VelocityContent({
  data,
  backlogPoints,
}: {
  // Milestone[] with closed flags and point totals
  data: import("@/lib/api/types").Milestone[]
  backlogPoints: number
}) {
  const completed = data.filter((m) => m.closed)
  const velocities = completed.map((m) => m.closed_points)
  const avgVelocity =
    velocities.length > 0
      ? Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length)
      : 0
  // Bars compare throughput across sprints (normalized to the best sprint).
  const maxVelocity = Math.max(...velocities, 1)
  const sprintsRemaining =
    avgVelocity > 0 ? Math.ceil(backlogPoints / avgVelocity) : 0
  const current = data.find((m) => !m.closed)
  const currentProgress = current
    ? Math.round((current.closed_points / (current.total_points || 1)) * 100)
    : 0

  return (
    <div className="space-y-8">
      <ReportFigures
        className="mt-6"
        figures={[
          {
            label: "Avg velocity",
            value: String(avgVelocity),
            sub: "points per completed sprint",
          },
          {
            label: "Backlog",
            value: String(backlogPoints),
            barColor: "bg-amber-500",
            progress:
              data.reduce((sum, m) => sum + m.total_points, 0) > 0
                ? Math.round((backlogPoints / data.reduce((sum, m) => sum + m.total_points, 0)) * 100)
                : 0,
            sub: "open points not in a sprint",
          },
          {
            label: "Sprints left",
            value: String(sprintsRemaining || "—"),
            sub: sprintsRemaining > 0 ? "to finish the backlog" : "no backlog left",
          },
          {
            label: "Current sprint",
            value: `${currentProgress}%`,
            barColor: "bg-emerald-500",
            progress: currentProgress,
            sub: current ? `${current.closed_points}/${current.total_points} points` : "no active sprint",
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Per-sprint delivery */}
        <div className="rounded-lg border bg-card p-5 transition-colors hover:border-ring/40 lg:col-span-7">
          <h2 className={REPORT_KICKER}>Per-sprint delivery</h2>
          <div className="mt-4 space-y-2.5">
            {data.map((milestone) => (
              <div key={milestone.id} className="flex items-center gap-3">
                <div
                  className="w-28 truncate text-sm text-muted-foreground"
                  title={milestone.name}
                >
                  {milestone.name}
                </div>
                <div className="bg-muted h-5 flex-1 overflow-hidden rounded">
                  <div
                    className={`h-full rounded transition-all duration-300 ${
                      milestone.closed ? "bg-primary" : "bg-amber-500"
                    }`}
                    style={{
                      width: `${(milestone.closed_points / maxVelocity) * 100}%`,
                    }}
                  />
                </div>
                <div className="w-14 text-right text-xs text-muted-foreground tabular-nums">
                  {milestone.closed_points}/{milestone.total_points}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current sprint */}
        <div className="rounded-lg border bg-card p-5 transition-colors hover:border-ring/40 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className={REPORT_KICKER}>Current sprint</h2>
            {current && (
              <span className="text-muted-foreground text-xs">{current.name}</span>
            )}
          </div>

          {current ? (
            <div className="mt-4 space-y-3">
              <div>
                <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs tabular-nums">
                  <span>
                    {current.closed_points} / {current.total_points} points
                  </span>
                  <span>{currentProgress}%</span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${currentProgress}%` }}
                  />
                </div>
              </div>
              <div className="text-muted-foreground space-y-0.5 text-xs tabular-nums">
                <div>
                  <span className="text-foreground">{current.estimated_start}</span>
                  {" → "}
                  <span className="text-foreground">{current.estimated_finish}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No active sprint
            </div>
          )}
        </div>

        {/* Projection */}
        <div className="rounded-lg border bg-card p-5 transition-colors hover:border-ring/40 lg:col-span-12">
          <h2 className={REPORT_KICKER}>Completion projection</h2>
          {avgVelocity > 0 ? (
            <>
              <p className="text-muted-foreground mt-4 max-w-xl text-sm">
                At the average velocity of{" "}
                <span className="text-foreground font-medium">{avgVelocity} points/sprint</span>
                , the remaining{" "}
                <span className="text-amber-500 font-medium">{backlogPoints} backlog points</span>{" "}
                land in roughly{" "}
                <span className="text-emerald-500 font-medium">
                  {sprintsRemaining} more {sprintsRemaining === 1 ? "sprint" : "sprints"}
                </span>
                .
              </p>
              <div className="mt-4 flex items-center gap-1">
                {Array(Math.min(sprintsRemaining + completed.length, 20))
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      title={
                        i < completed.length
                          ? `Sprint ${i + 1} (completed)`
                          : i === completed.length
                            ? "Current sprint"
                            : `Sprint ${i + 1} (projected)`
                      }
                      className={`h-8 flex-1 rounded transition-colors ${
                        i < completed.length
                          ? "bg-primary"
                          : i === completed.length
                            ? "bg-amber-500"
                            : "bg-accent"
                      }`}
                    />
                  ))}
              </div>
              <div className="text-muted-foreground mt-2 flex justify-between text-xs">
                <span>Sprint 1</span>
                <span>
                  Sprint {Math.min(sprintsRemaining + completed.length, 20)}
                  {sprintsRemaining + completed.length > 20 ? "+" : ""}
                </span>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground mt-4 text-sm">
              Complete at least one sprint to see projections.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
