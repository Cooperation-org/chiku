import { useState } from "react"
import { useParams } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { CreateStoryDialog } from "@/components/app/create-story-dialog"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useProjectBySlug } from "@/lib/queries/projects"

/** Backlog toolbar controls, declared by the backlog route via staticData. */
export function BacklogToolbarControls() {
  const params = useParams({ strict: false })
  const slug = (params as { slug?: string }).slug
  const { project } = useProjectBySlug(slug)
  const [showCreate, setShowCreate] = useState(false)

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCreate(true)}
              disabled={!project}
              aria-label="New story"
            />
          }
        >
          <Plus className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent side="bottom">New story</TooltipContent>
      </Tooltip>

      {project && (
        <CreateStoryDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          projectId={project.id}
          defaultStatusId={null}
        />
      )}
    </>
  )
}
