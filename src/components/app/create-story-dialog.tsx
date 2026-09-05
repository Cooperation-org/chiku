import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StoryStatusSelect } from "@/components/inputs/story-status-select"
import { AssigneeSelect } from "@/components/inputs/assignee-select"
import { useCreateStory } from "@/lib/queries/stories"
import type { UserStory } from "@/lib/api/types"

interface CreateStoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  defaultStatusId: number | null
  onCreated?: (story: UserStory) => void
}

export function CreateStoryDialog({
  open,
  onOpenChange,
  projectId,
  defaultStatusId,
  onCreated,
}: CreateStoryDialogProps) {
  const createStory = useCreateStory(projectId)
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [statusId, setStatusId] = useState<number | null>(null)
  const [assignedTo, setAssignedTo] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setSubject("")
    setDescription("")
    setStatusId(defaultStatusId)
    setAssignedTo(null)
  }, [open, defaultStatusId])

  async function handleCreate() {
    if (!subject.trim() || createStory.isPending) return
    try {
      const story = await createStory.mutateAsync({
        project: projectId,
        subject: subject.trim(),
        description: description.trim(),
        status: statusId ?? undefined,
        assigned_to: assignedTo,
      })
      toast(`Created #${story.ref}`)
      onCreated?.(story)
      onOpenChange(false)
    } catch (err) {
      toast.error(`Failed to create story: ${(err as Error).message}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Story</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="story-subject">Title</Label>
            <Input
              id="story-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCreate()
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <StoryStatusSelect
              projectId={projectId}
              value={statusId}
              onValueChange={setStatusId}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <AssigneeSelect
              projectId={projectId}
              value={assignedTo}
              onValueChange={setAssignedTo}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="story-desc">Description</Label>
            <Textarea
              id="story-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details (optional)"
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <p className="text-muted-foreground text-xs">
            Press <kbd className="rounded bg-accent px-1">Cmd+Enter</kbd> to create
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!subject.trim() || createStory.isPending}>
              {createStory.isPending ? "Creating..." : "Create Story"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
