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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateStory } from "@/lib/queries/stories"
import type { UserStory, UserStoryStatus } from "@/lib/api/types"

interface CreateStoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  statuses: UserStoryStatus[]
  defaultStatusId: number | null
  members: { id: number; full_name: string; username: string }[]
  onCreated?: (story: UserStory) => void
}

export function CreateStoryDialog({
  open,
  onOpenChange,
  projectId,
  statuses,
  defaultStatusId,
  members,
  onCreated,
}: CreateStoryDialogProps) {
  const createStory = useCreateStory(projectId)
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<string>("")
  const [assignedTo, setAssignedTo] = useState<string>("unassigned")

  const sortedStatuses = [...statuses].sort((a, b) => a.order - b.order)

  useEffect(() => {
    if (!open) return
    setSubject("")
    setDescription("")
    setStatus(defaultStatusId ? String(defaultStatusId) : sortedStatuses[0] ? String(sortedStatuses[0].id) : "")
    setAssignedTo("unassigned")
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate() {
    if (!subject.trim() || createStory.isPending) return
    try {
      const story = await createStory.mutateAsync({
        project: projectId,
        subject: subject.trim(),
        description: description.trim(),
        status: status ? Number(status) : undefined,
        assigned_to: assignedTo !== "unassigned" ? Number(assignedTo) : null,
      })
      toast(`Created #${story.ref}`)
      onCreated?.(story)
      onOpenChange(false)
    } catch (err) {
      toast.error(`Failed to create story: ${(err as Error).message}`)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
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

          {sortedStatuses.length > 0 && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortedStatuses.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {members.length > 0 && (
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Select value={assignedTo} onValueChange={(v) => setAssignedTo(v ?? "unassigned")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.full_name || m.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
