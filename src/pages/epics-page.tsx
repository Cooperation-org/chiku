import { useState } from "react"
import { CirclePlus } from "lucide-react"
import { toast } from "sonner"
import { Avatar } from "@/components/app/avatar"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCreateEpic, useDeleteEpic, useEpics, useUpdateEpic } from "@/lib/queries/epics"
import { useProjectBySlug } from "@/lib/queries/projects"
import type { Epic } from "@/lib/api/types"

const epicColors = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
]

function getProgress(epic: Epic): number {
  const counts = epic.user_stories_counts
  if (!counts || counts.total === 0) return 0
  return Math.round((counts.progress / counts.total) * 100)
}

function formatRelativeDate(dateStr: string): string {
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "today"
  if (diffDays === 1) return "1d"
  if (diffDays < 7) return `${diffDays}d`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`
  return `${Math.floor(diffDays / 365)}y`
}

function CreateEpicDialog({
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
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCreate()
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
                    color === c ? "ring-foreground ring-offset-background scale-110 ring-2 ring-offset-2" : "hover:scale-110"
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
          <p className="text-muted-foreground text-xs">
            Press <kbd className="rounded bg-accent px-1">Cmd+Enter</kbd> to create
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!subject.trim() || createEpic.isPending}>
              {createEpic.isPending ? "Creating..." : "Create Epic"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EpicDialog({
  epic,
  onOpenChange,
  projectId,
}: {
  epic: Epic | null
  onOpenChange: (open: boolean) => void
  projectId: number
}) {
  const updateEpic = useUpdateEpic(projectId)
  const deleteEpic = useDeleteEpic(projectId)
  const [editing, setEditing] = useState(false)
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)

  function startEdit() {
    if (!epic) return
    setSubject(epic.subject)
    setDescription(epic.description || "")
    setColor(epic.color || "#3b82f6")
    setEditing(true)
  }

  async function save() {
    if (!epic) return
    try {
      await updateEpic.mutateAsync({
        id: epic.id,
        data: { subject: subject.trim(), description: description.trim(), color },
      })
      setEditing(false)
    } catch (err) {
      toast.error(`Failed to save: ${(err as Error).message}`)
    }
  }

  async function remove() {
    if (!epic) return
    try {
      await deleteEpic.mutateAsync(epic.id)
      setConfirmDelete(false)
      onOpenChange(false)
    } catch (err) {
      toast.error(`Failed to delete: ${(err as Error).message}`)
    }
  }

  return (
    <>
      <Dialog open={!!epic} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          {epic && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>
                    <span className="text-muted-foreground font-mono text-sm">#{epic.ref}</span> {epic.subject}
                  </DialogTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={editing ? () => setEditing(false) : startEdit}>
                      {editing ? "Cancel" : "Edit"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                    style={{
                      backgroundColor: `${epic.status_extra_info?.color ?? "#666"}20`,
                      color: epic.status_extra_info?.color ?? "#666",
                    }}
                  >
                    {epic.status_extra_info?.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {epic.user_stories_counts?.progress ?? 0}/{epic.user_stories_counts?.total ?? 0} stories Â·{" "}
                    {getProgress(epic)}%
                  </span>
                </div>

                {editing ? (
                  <div className="space-y-3">
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Epic name" />
                    <div className="flex flex-wrap gap-2">
                      {epicColors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`h-7 w-7 rounded-full transition-transform ${
                            color === c ? "ring-foreground scale-110 ring-2" : "hover:scale-110"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={5}
                      placeholder="Description"
                    />
                    <div className="flex justify-end">
                      <Button onClick={save} disabled={!subject.trim() || updateEpic.isPending}>
                        {updateEpic.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground min-h-12 whitespace-pre-wrap text-sm">
                    {epic.description || "No description"}
                  </p>
                )}

                <div>
                  <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                    <span>Progress</span>
                    <span>{getProgress(epic)}%</span>
                  </div>
                  <div className="bg-accent h-1.5 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${getProgress(epic)}%`, backgroundColor: epic.color }}
                    />
                  </div>
                </div>

                {epic.assigned_to_extra_info && (
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={epic.assigned_to_extra_info.full_name_display || epic.assigned_to_extra_info.full_name}
                      photo={epic.assigned_to_extra_info.photo}
                      size="sm"
                      className="text-white"
                    />
                    <span className="text-muted-foreground text-sm">
                      {epic.assigned_to_extra_info.full_name_display || epic.assigned_to_extra_info.full_name}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete epic?</AlertDialogTitle>
            <AlertDialogDescription>
              {epic?.subject} will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default function EpicsPage({ slug }: { slug: string }) {
  const { project: currentProject } = useProjectBySlug(slug)
  const projectId = currentProject?.id ?? null
  const { data: epics, isLoading } = useEpics(projectId)
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<Epic | null>(null)

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Select a project to view epics</div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">{currentProject.name}</h1>
          <p className="text-muted-foreground text-sm">Epics Â· {epics?.length ?? 0} total</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <CirclePlus className="h-4 w-4" />
          New Epic
        </Button>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">Loading epics...</div>
          </div>
        ) : !epics || epics.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">No epics yet</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {epics.map((epic) => (
              <button
                key={epic.id}
                onClick={() => setSelected(epic)}
                className="bg-card hover:border-ring group cursor-pointer overflow-hidden rounded-lg border text-left transition-colors"
              >
                <div className="h-1" style={{ backgroundColor: epic.color }} />
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">#{epic.ref}</span>
                      <span className="text-muted-foreground/70 text-xs">{formatRelativeDate(epic.modified_date)}</span>
                    </div>
                    {epic.status_extra_info && (
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                        style={{
                          backgroundColor: `${epic.status_extra_info.color}20`,
                          color: epic.status_extra_info.color,
                        }}
                      >
                        {epic.status_extra_info.name}
                      </span>
                    )}
                  </div>
                  <h3 className="group-hover:text-primary mb-1 font-medium transition-colors">{epic.subject}</h3>
                  {epic.description ? (
                    <p className="text-muted-foreground line-clamp-2 mb-4 text-sm">{epic.description}</p>
                  ) : (
                    <p className="text-muted-foreground/70 mb-4 text-sm italic">No description</p>
                  )}
                  <div className="mb-3">
                    <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                      <span>Progress</span>
                      <span>{getProgress(epic)}%</span>
                    </div>
                    <div className="bg-accent h-1.5 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${getProgress(epic)}%`, backgroundColor: epic.color }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      <span className="text-foreground">{epic.user_stories_counts?.progress || 0}</span>/
                      {epic.user_stories_counts?.total || 0} stories
                    </span>
                    {epic.assigned_to_extra_info && (
                      <Avatar
                        name={epic.assigned_to_extra_info.full_name_display || epic.assigned_to_extra_info.full_name}
                        photo={epic.assigned_to_extra_info.photo}
                        size="sm"
                        className="text-white"
                      />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <CreateEpicDialog open={showCreate} onOpenChange={setShowCreate} projectId={currentProject.id} />
      <EpicDialog epic={selected} onOpenChange={(open) => !open && setSelected(null)} projectId={currentProject.id} />
    </div>
  )
}
