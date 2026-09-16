import { PageTransition } from "@/components/layout/page-transition"
import { REPORT_KICKER, ReportFigures } from "@/components/layout/report"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  PROJECT_VIEWS,
  viewEnabled,
  type ProjectView,
} from "@/lib/project-views"
import { useProjectBySlug, useProjectStats } from "@/lib/queries/projects"
import { useNavigate } from "@tanstack/react-router"
import { KanbanSquare, Layers, LineChart, Rows3, Timer } from "lucide-react"

const VIEW_ICONS: Record<ProjectView, typeof KanbanSquare> = {
  board: KanbanSquare,
  backlog: Rows3,
  sprints: Timer,
  epics: Layers,
  velocity: LineChart,
}

function clampPct(done: number, total: number): number {
  if (!total || total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)))
}

/** The project homepage — agile totals plus the per-sprint series. */
export default function OverviewPage({ slug }: { slug: string }) {
  const navigate = useNavigate()
  const { project: currentProject } = useProjectBySlug(slug)
  const projectId = currentProject?.id ?? null
  const { data: stats, isLoading, isError } = useProjectStats(projectId)

  function goView(view: ProjectView) {
    navigate({ to: `/projects/${slug}/${view}`, params: { slug } })
  }

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">
          Select a project to view its overview
        </div>
      </div>
    )
  }

  const figureData = stats
    ? [
        {
          label: "Defined",
          value: String(stats.defined_points),
          sub: "total scope in points",
        },
        {
          label: "Closed",
          value: String(stats.closed_points),
          barColor: "bg-emerald-500",
          progress:
            stats.defined_points > 0
              ? Math.round((stats.closed_points / stats.defined_points) * 100)
              : 0,
          sub: "of defined points",
        },
        {
          label: "Assigned",
          value: String(stats.assigned_points),
          sub: "claimed by stories",
        },
        {
          label: "Speed",
          value: String(stats.speed),
          sub: "points per day",
        },
      ]
    : []
  const total = stats?.total_points ?? stats?.defined_points ?? 0

  return (
    <PageTransition transitionKey={slug}>
      <div className="h-full overflow-auto">
        <div className="mx-auto max-w-5xl space-y-6 p-6">
          {currentProject.description && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {currentProject.description}
            </p>
          )}

          {isLoading || !stats ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-muted-foreground">
              Could not load project stats.
            </div>
          ) : (
            <>
              <ReportFigures figures={figureData} />

              <div className="rounded-lg border bg-card transition-colors hover:border-ring/40">
                <div className="border-b p-5">
                  <h2 className={REPORT_KICKER}>Sprints</h2>
                </div>
                <div className="space-y-4 p-5">
                  {stats.milestones.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No sprints yet.
                    </div>
                  ) : (
                    stats.milestones.map((m) => {
                      const upcoming = m.evolution == null
                      const done = upcoming ? 0 : total - (m.evolution ?? 0)
                      const pct = clampPct(done, total)
                      return (
                        <div
                          key={m.name}
                          className={upcoming ? "opacity-60" : undefined}
                        >
                          <div className="mb-1 flex items-baseline justify-between text-sm">
                            <span className="font-medium">{m.name}</span>
                            <span className="text-muted-foreground">
                              {upcoming
                                ? "Upcoming"
                                : `${done} of ${total} points`}
                            </span>
                          </div>
                          {!upcoming && <Progress value={pct} />}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {PROJECT_VIEWS.filter((v) =>
                  viewEnabled(currentProject, v.key)
                ).map((v) => {
                  const Icon = VIEW_ICONS[v.key]
                  return (
                    <Button
                      key={v.key}
                      variant="outline"
                      onClick={() => goView(v.key)}
                    >
                      <Icon className="h-4 w-4" />
                      Open {v.label}
                    </Button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
