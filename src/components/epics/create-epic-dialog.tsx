import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { epicColors } from "@/components/epics/epic-colors"
import { useCreateEpic } from "@/lib/queries/epics"

export function CreateEpicDialog({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
}) {
  const createEpic = useCreateEpic(projectId)
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState("#3b82f6")

  function reset() {
    setSubject("")
    setDescription("")
    setColor("#3b82f6")
  }

  async function handleCreate() {
    if (!subject.trim() || createEpic.isPending) return
    try {
      await createEpic.mutateAsync({
        project: projectId,
        subject: subject.trim(),
        description: description.trim(),
        color,
      })
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(`Failed to create epic: ${(err as Error).message}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Epic</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="epic-subject">Title</Label>
            <Input
              id="epic-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Epic name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                  handleCreate()
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {epicColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full transition-transform ${
                    color === c
                      ? "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="epic-desc">Description</Label>
            <Textarea
              id="epic-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the epic (optional)"
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="rounded bg-accent px-1">Cmd+Enter</kbd> to
            create
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!subject.trim() || createEpic.isPending}
            >
              {createEpic.isPending ? "Creating..." : "Create Epic"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
