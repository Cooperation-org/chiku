import { useState } from "react"
import { useParams } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { AddMemberDialog } from "@/components/members/add-member-dialog"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useProjectBySlug } from "@/lib/queries/projects"

/** Members toolbar controls, declared by the members route via staticData. */
export function MembersToolbarControls() {
  const params = useParams({ strict: false })
  const slug = (params as { slug?: string }).slug
  const { project } = useProjectBySlug(slug)
  const canManage = project?.i_am_admin === true
  const [showAdd, setShowAdd] = useState(false)

  if (!canManage) return null

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAdd(true)}
              disabled={!project}
              aria-label="Add member"
            />
          }
        >
          <Plus className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent side="bottom">Add member</TooltipContent>
      </Tooltip>

      {project && (
        <AddMemberDialog
          open={showAdd}
          onOpenChange={setShowAdd}
          project={project}
        />
      )}
    </>
  )
}
