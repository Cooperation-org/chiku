import { useState } from "react"
import { useParams } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { CreateEpicDialog } from "@/components/epics/create-epic-dialog"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useProjectBySlug } from "@/lib/queries/projects"

/** Epics toolbar controls, declared by the epics route via staticData. */
export function EpicsToolbarControls() {
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
              aria-label="New epic"
            />
          }
        >
          <Plus className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent side="bottom">New epic</TooltipContent>
      </Tooltip>

      {project && (
        <CreateEpicDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          projectId={project.id}
        />
      )}
    </>
  )
}
