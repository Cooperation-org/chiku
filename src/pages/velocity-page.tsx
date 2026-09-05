import { useVelocityData } from "@/lib/queries/milestones"
import { useResolvedProject } from "@/lib/queries/projects"

export default function VelocityPage({ slug }: { slug: string }) {
  const { project: currentProject } = useResolvedProject(slug)
  const { data, isLoading } = useVelocityData(currentProject?.id ?? null)

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Select a project to view velocity</div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">{currentProject.name}</h1>
          <p className="text-muted-foreground text-sm">Velocity &amp; Burndown</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">Loading velocity data...</div>
          </div>
        ) : !data || data.milestones.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">No sprints yet. Create a sprint to track velocity.</div>
          </div>
        ) : <VelocityContent data={data.milestones} backlogPoints={data.backlogPoints} />}
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
    velocities.length > 0 ? Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length) : 0
  const maxVelocity = Math.max(...velocities, 1)
  const sprintsRemaining = avgVelocity > 0 ? Math.ceil(backlogPoints / avgVelocity) : 0
  const current = data.find((m) => !m.closed)
  const currentProgress = current
    ? Math.round((current.closed_points / (current.total_points || 1)) * 100)
    : 0

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Velocity overview */}
      <div className="bg-card rounded-lg border p-6">
        <h2 className="mb-4 font-medium">Velocity Overview</h2>
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="bg-accent rounded-lg p-4">
            <div className="text-primary text-2xl font-bold">{avgVelocity}</div>
            <div className="text-muted-foreground text-sm">Avg Velocity</div>
          </div>
          <div className="bg-accent rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-500">{backlogPoints}</div>
            <div className="text-muted-foreground text-sm">Backlog Points</div>
          </div>
          <div className="bg-accent rounded-lg p-4">
            <div className="text-2xl font-bold text-emerald-500">{sprintsRemaining}</div>
            <div className="text-muted-foreground text-sm">Sprints Left</div>
          </div>
        </div>

        <div className="space-y-2">
          {data.map((milestone) => (
            <div key={milestone.id} className="flex items-center gap-3">
              <div className="text-muted-foreground w-24 truncate text-sm" title={milestone.name}>
                {milestone.name}
              </div>
              <div className="bg-accent h-6 flex-1 overflow-hidden rounded">
                <div
                  className={`h-full rounded transition-all duration-300 ${
                    milestone.closed ? "bg-primary" : "bg-amber-500"
                  }`}
                  style={{ width: `${(milestone.closed_points / maxVelocity) * 100}%` }}
                />
              </div>
              <div className="text-muted-foreground w-12 text-right text-sm">
                {milestone.closed_points}/{milestone.total_points}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current sprint */}
      <div className="bg-card rounded-lg border p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">Current Sprint</h2>
          {current && <span className="text-muted-foreground text-sm">{current.name}</span>}
        </div>

        {current ? (
          <>
            <div className="mb-6">
              <div className="text-muted-foreground mb-2 flex items-center justify-between text-sm">
                <span>
                  {current.closed_points} / {current.total_points} points
                </span>
                <span>{currentProgress}%</span>
              </div>
              <div className="bg-accent h-2 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
            </div>
            <div className="text-muted-foreground space-y-1 text-sm">
              <div>
                Start: <span className="text-foreground">{current.estimated_start}</span>
              </div>
              <div>
                End: <span className="text-foreground">{current.estimated_finish}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground py-8 text-center">No active sprint</div>
        )}
      </div>

      {/* Projection */}
      <div className="bg-card lg:col-span-2 rounded-lg border p-6">
        <h2 className="mb-4 font-medium">Completion Projection</h2>
        {avgVelocity > 0 ? (
          <>
            <p className="text-muted-foreground mb-4">
              At your current average velocity of <span className="text-primary font-medium">{avgVelocity} points/sprint</span>,
              you will complete the remaining <span className="font-medium text-amber-500">{backlogPoints} backlog points</span> in
              approximately <span className="font-medium text-emerald-500">{sprintsRemaining} sprints</span>.
            </p>
            <div className="flex items-center gap-1">
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
          <p className="text-muted-foreground">Complete at least one sprint to see projections.</p>
        )}
      </div>
    </div>
  )
}
