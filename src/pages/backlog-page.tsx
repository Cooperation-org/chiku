import { toast } from "sonner"
import { BacklogTable } from "@/components/backlog/backlog-table"
import { PageLoading } from "@/components/layout/page-state"
import {
  PagePresence,
  PageTransition,
} from "@/components/layout/page-transition"
import { ModuleDisabled } from "@/components/project/module-disabled"
import { SprintCountdownBadge } from "@/components/sprints/sprint-countdown-badge"
import { Button } from "@/components/ui/button"
import type { UserStory } from "@/lib/api/types"
import { viewEnabled } from "@/lib/project-views"
import { useProjectBySlug } from "@/lib/queries/projects"
import { useStories } from "@/lib/queries/stories"
import { useMilestones, useMoveStoryToSprint } from "@/lib/queries/milestones"
import { backlogStories, openSprintsSorted, rolloverTarget, unfinishedStories } from "@/lib/sprints"
import { useNavigate } from "@tanstack/react-router"

interface BacklogPageProps {
  slug: string
  filter: string
}

export default function BacklogPage({ slug, filter }: BacklogPageProps) {
  const navigate = useNavigate()
  const { project: currentProject } = useProjectBySlug(slug)
  const projectId = currentProject?.id ?? null

  const { data: stories, isLoading } = useStories(projectId)
  const { data: milestones = [] } = useMilestones(projectId)
  const moveToSprint = useMoveStoryToSprint(projectId ?? 0)

  const unassigned = backlogStories(stories ?? []).sort(
    (a, b) => (a.backlog_order ?? 0) - (b.backlog_order ?? 0)
  )
  const openSprints = openSprintsSorted(milestones)

  function handleMoveToSprint(story: UserStory, milestoneId: number | null) {
    if (story.milestone === milestoneId) return
    moveToSprint.mutate(
      { storyId: story.id, milestoneId, version: story.version },
      {
        onSuccess: () =>
          toast.success(
            milestoneId == null
              ? `#${story.ref} moved back to the backlog`
              : `#${story.ref} planned into sprint`,
          ),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to move story"),
      },
    )
  }
  function openStory(story: UserStory) {
    navigate({
      to: "/projects/$slug/board/$storyRef",
      params: { slug, storyRef: String(story.ref) },
    })
  }

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

  const hasWork = (stories ?? []).length > 0

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <PagePresence>
          {isLoading ? (
            <PageLoading key="loading" label="Loading backlog" />
          ) : !hasWork ? (
            <PageTransition key="empty">
              <div className="flex h-full items-center justify-center">
                <div className="text-muted-foreground">
                  No stories in backlog
                </div>
              </div>
            </PageTransition>
          ) : (
            <PageTransition key="backlog">
              <div className="space-y-8 p-6">
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-medium">
                    Backlog <span className="text-muted-foreground">· {unassigned.length} unassigned</span>
                  </h2>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate({ to: "/projects/$slug/sprints", params: { slug } })}
                  >
                    Plan sprints
                  </Button>
                </div>
                {unassigned.length > 0 ? (
                  <BacklogTable
                    stories={unassigned}
                    filter={filter}
                    onOpen={openStory}
                    sprints={milestones}
                    onMoveToSprint={handleMoveToSprint}
                  />
                ) : (
                  <p className="text-muted-foreground rounded border border-dashed px-4 py-6 text-center text-sm">
                    Everything is planned into a sprint.
                  </p>
                )}
              </section>

              {openSprints.map((sprint) => {
                const inSprint = (stories ?? [])
                  .filter((s) => s.milestone === sprint.id)
                  .sort((a, b) => (a.sprint_order ?? 0) - (b.sprint_order ?? 0))
                const unfinished = unfinishedStories(stories ?? [], sprint.id)
                const target = rolloverTarget(milestones, sprint.id)
                return (
                  <section key={sprint.id}>
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h2 className="font-medium">
                        {sprint.name} <span className="text-muted-foreground">· {inSprint.length}</span>
                      </h2>
                      <SprintCountdownBadge
                        sprint={sprint}
                        unfinishedCount={unfinished.length}
                        rolloverName={target?.name}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          navigate({
                            to: "/projects/$slug/board",
                            params: { slug },
                            search: { sprint: sprint.id },
                          })
                        }
                      >
                        Board
                      </Button>
                    </div>
                    {inSprint.length > 0 ? (
                      <BacklogTable
                        stories={inSprint}
                        filter={filter}
                        onOpen={openStory}
                        sprints={milestones}
                        onMoveToSprint={handleMoveToSprint}
                      />
                    ) : (
                      <p className="text-muted-foreground rounded border border-dashed px-4 py-6 text-center text-sm">
                        No stories planned here yet.
                      </p>
                    )}
                  </section>
                )
              })}
              </div>
            </PageTransition>
          )}
        </PagePresence>
      </div>
    </div>
  )
}
