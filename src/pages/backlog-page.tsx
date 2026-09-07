import { BacklogTable } from "@/components/backlog/backlog-table"
import { PageLoading } from "@/components/layout/page-state"
import {
  PagePresence,
  PageTransition,
} from "@/components/layout/page-transition"
import { ModuleDisabled } from "@/components/project/module-disabled"
import type { UserStory } from "@/lib/api/types"
import { viewEnabled } from "@/lib/project-views"
import { useProjectBySlug } from "@/lib/queries/projects"
import { useStories } from "@/lib/queries/stories"
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

  const sorted = [...(stories ?? [])].sort(
    (a, b) => (a.backlog_order ?? 0) - (b.backlog_order ?? 0)
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
              <BacklogTable
                stories={sorted}
                filter={filter}
                onOpen={openStory}
              />
            </PageTransition>
          )}
        </PagePresence>
      </div>
    </div>
  )
}
