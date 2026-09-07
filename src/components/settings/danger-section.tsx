import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SettingsSection } from "@/components/settings/settings-section"
import {
  useArchiveProject,
  useDeleteProject,
  useUnarchiveProject,
} from "@/lib/queries/projects"
import { isArchived } from "@/lib/api/projects"
import type { Project } from "@/lib/api/types"

export function DangerSection({ project }: { project: Project }) {
  const navigate = useNavigate()
  const archive = useArchiveProject()
  const unarchive = useUnarchiveProject()
  const remove = useDeleteProject()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const archived = isArchived(project)
  const busy = archive.isPending || unarchive.isPending || remove.isPending

  function goHome() {
    navigate({ to: "/" })
  }

  function handleArchiveToggle() {
    if (archived) {
      unarchive.mutate(project, {
        onSuccess: () => toast.success("Project unarchived"),
        onError: (err) =>
          toast.error(`Failed to unarchive: ${err instanceof Error ? err.message : err}`),
      })
    } else {
      archive.mutate(project, {
        onSuccess: () => {
          toast.success("Project archived")
          goHome()
        },
        onError: (err) =>
          toast.error(`Failed to archive: ${err instanceof Error ? err.message : err}`),
      })
    }
  }

  function handleDelete() {
    remove.mutate(project.id, {
      onSuccess: () => {
        toast.success("Project deleted")
        setConfirmDelete(false)
        goHome()
      },
      onError: (err) =>
        toast.error(`Failed to delete project: ${err instanceof Error ? err.message : err}`),
    })
  }

  return (
    <SettingsSection title="Danger zone" description="Irreversible actions — proceed carefully.">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{archived ? "Unarchive project" : "Archive project"}</p>
          <p className="text-muted-foreground text-xs">
            {archived ? "Restore the project to the active list" : "Hide the project from the active list"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleArchiveToggle} disabled={busy}>
          {archive.isPending || unarchive.isPending
            ? "Working..."
            : archived
              ? "Unarchive"
              : "Archive"}
        </Button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
        <div>
          <p className="text-sm font-medium">Delete project</p>
          <p className="text-muted-foreground text-xs">Permanently remove everything — cannot be undone</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Delete <strong>{project.name}</strong> permanently? All issues in this project will
            be removed. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={remove.isPending}>
              {remove.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  )
}
