import { useNavigate } from "@tanstack/react-router"
import { ModuleDisabled } from "@/components/project/module-disabled"
import { BacklogTable } from "@/components/backlog/backlog-table"
import {
  PagePresence,
  PageTransition,
} from "@/components/layout/page-transition"
import { PageLoading } from "@/components/layout/page-state"
import { ReportMasthead } from "@/components/layout/report"
import { useProjectBySlug } from "@/lib/queries/projects"
import { useStories } from "@/lib/queries/stories"
import { viewEnabled } from "@/lib/project-views"
import type { UserStory } from "@/lib/api/types"

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
              <BacklogTable stories={sorted} onOpen={openStory} />
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
