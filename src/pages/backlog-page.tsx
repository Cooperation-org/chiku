import { useNavigate } from "@tanstack/react-router"
import { Avatar } from "@/components/app/avatar"
import { ModuleDisabled } from "@/components/project/module-disabled"
import {
  PagePresence,
  PageTransition,
} from "@/components/layout/page-transition"
import { PageLoading } from "@/components/layout/page-state"
import { ReportMasthead } from "@/components/layout/report"
import { useProjectBySlug } from "@/lib/queries/projects"
import { useStories } from "@/lib/queries/stories"
import { viewEnabled } from "@/lib/project-views"

function formatRelativeDate(dateStr: string): string {
  const diffDays = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (diffDays === 0) return "today"
  if (diffDays === 1) return "1d"
  if (diffDays < 7) return `${diffDays}d`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`
  return `${Math.floor(diffDays / 365)}y`
}

interface BacklogPageProps {
  slug: string
}

export default function BacklogPage({ slug }: BacklogPageProps) {
  const navigate = useNavigate()
  const { project: currentProject } = useProjectBySlug(slug)
  const projectId = currentProject?.id ?? null

  const { data: stories, isLoading } = useStories(projectId)

  const sorted = [...(stories ?? [])].sort(
    (a, b) => (a.backlog_order ?? 0) - (b.backlog_order ?? 0)
  )
  const openStories = sorted.filter((s) => !s.is_closed)
  const totalPoints = sorted.reduce((sum, s) => sum + (s.total_points || 0), 0)
  const openPoints = openStories.reduce(
    (sum, s) => sum + (s.total_points || 0),
    0
  )

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">
          Select a project to view the backlog
        </div>
      </div>
    )
  }

  if (!viewEnabled(currentProject, "backlog")) {
    return <ModuleDisabled view="Backlog" slug={slug} />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-5xl px-6">
        <div className="border-b py-3">
          <ReportMasthead
            kicker="Backlog"
            tag={`${openStories.length} open · ${openPoints} pts`}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <PagePresence>
          {isLoading ? (
            <PageLoading key="loading" label="Loading backlog" />
          ) : !stories || sorted.length === 0 ? (
            <PageTransition key="empty">
              <div className="flex h-full items-center justify-center">
                <div className="text-muted-foreground">
                  No stories in backlog
                </div>
              </div>
            </PageTransition>
          ) : (
            <PageTransition key="backlog">
              <table className="w-full">
                <thead className="sticky top-0 border-b bg-background/70 backdrop-blur">
                  <tr className="text-left text-xs tracking-wider text-muted-foreground uppercase">
                    <th className="w-16 px-6 py-3">Ref</th>
                    <th className="px-6 py-3">Story</th>
                    <th className="w-32 px-6 py-3">Status</th>
                    <th className="w-32 px-6 py-3">Assignee</th>
                    <th className="w-16 px-6 py-3 text-right">Points</th>
                    <th className="w-16 px-6 py-3 text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sorted.map((story) => (
                    <tr
                      key={story.id}
                      className="group cursor-pointer transition-colors hover:bg-accent/40"
                      onClick={() =>
                        navigate({
                          to: "/projects/$slug/board/$storyRef",
                          params: { slug, storyRef: String(story.ref) },
                        })
                      }
                    >
                      <td className="px-6 py-3">
                        <span className="text-sm text-muted-foreground">
                          #{story.ref}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="transition-colors group-hover:text-primary">
                            {story.subject}
                          </span>
                          <div className="flex items-center gap-2">
                            {story.epics?.map((epic) => (
                              <span
                                key={epic.id}
                                className="rounded px-1.5 py-0.5 text-xs"
                                style={{
                                  backgroundColor: `${epic.color}20`,
                                  color: epic.color,
                                }}
                              >
                                {epic.subject}
                              </span>
                            ))}
                            {story.tags?.map(([tag, color]) => (
                              <span
                                key={tag}
                                className="rounded px-1.5 py-0.5 text-xs"
                                style={{
                                  backgroundColor: `${color || "#666"}20`,
                                  color: color || "#999",
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        {story.status_extra_info && (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs"
                            style={{
                              backgroundColor: `${story.status_extra_info.color}20`,
                              color: story.status_extra_info.color,
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                backgroundColor: story.status_extra_info.color,
                              }}
                            />
                            {story.status_extra_info.name}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {story.assigned_to_extra_info ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={
                                story.assigned_to_extra_info.full_name_display
                              }
                              photo={story.assigned_to_extra_info.photo}
                              size="sm"
                              className="text-white"
                            />
                            <span className="text-sm text-muted-foreground">
                              {
                                story.assigned_to_extra_info.full_name_display.split(
                                  " "
                                )[0]
                              }
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground/60">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right font-medium">
                        {story.total_points || "-"}
                      </td>
                      <td className="px-6 py-3 text-right text-xs text-muted-foreground">
                        {formatRelativeDate(story.modified_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </PageTransition>
          )}
        </PagePresence>
      </div>

      {sorted.length > 0 && (
        <footer className="flex items-center justify-between border-t bg-background/70 px-6 py-3 text-sm">
          <span className="text-muted-foreground">
            {sorted.length} total stories
          </span>
          <span className="text-muted-foreground">
            Total: <span className="font-medium">{totalPoints} points</span>
          </span>
        </footer>
      )}
    </div>
  )
}
