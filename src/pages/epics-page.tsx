import { Avatar } from "@/components/app/avatar"
import { epicColors } from "@/components/epics/epic-colors"
import { PageLoading } from "@/components/layout/page-state"
import {
  PagePresence,
  PageTransition,
} from "@/components/layout/page-transition"
import { ModuleDisabled } from "@/components/project/module-disabled"
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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Epic } from "@/lib/api/types"
import { formatRelativeDate } from "@/lib/format"
import { viewEnabled } from "@/lib/project-views"
import { useDeleteEpic, useEpics, useUpdateEpic } from "@/lib/queries/epics"
import { useProjectBySlug } from "@/lib/queries/projects"
import { useState } from "react"
import { toast } from "sonner"

function getProgress(epic: Epic): number {
  const counts = epic.user_stories_counts
  if (!counts || counts.total === 0) return 0
  return Math.round((counts.progress / counts.total) * 100)
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
        data: {
          subject: subject.trim(),
          description: description.trim(),
          color,
        },
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
                    <span className="font-mono text-sm text-muted-foreground">
                      #{epic.ref}
                    </span>{" "}
                    {epic.subject}
                  </DialogTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={editing ? () => setEditing(false) : startEdit}
                    >
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
                  <span className="text-xs text-muted-foreground">
                    {epic.user_stories_counts?.progress ?? 0}/
                    {epic.user_stories_counts?.total ?? 0} stories ·{" "}
                    {getProgress(epic)}%
                  </span>
                </div>

                {editing ? (
                  <div className="space-y-3">
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Epic name"
                    />
                    <div className="flex flex-wrap gap-2">
                      {epicColors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`h-7 w-7 rounded-full transition-transform ${
                            color === c
                              ? "scale-110 ring-2 ring-foreground"
                              : "hover:scale-110"
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
                      <Button
                        onClick={save}
                        disabled={!subject.trim() || updateEpic.isPending}
                      >
                        {updateEpic.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="min-h-12 text-sm whitespace-pre-wrap text-muted-foreground">
                    {epic.description || "No description"}
                  </p>
                )}

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{getProgress(epic)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-accent">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${getProgress(epic)}%`,
                        backgroundColor: epic.color,
                      }}
                    />
                  </div>
                </div>

                {epic.assigned_to_extra_info && (
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={
                        epic.assigned_to_extra_info.full_name_display ||
                        epic.assigned_to_extra_info.full_name
                      }
                      photo={epic.assigned_to_extra_info.photo}
                      size="sm"
                      className="text-white"
                    />
                    <span className="text-sm text-muted-foreground">
                      {epic.assigned_to_extra_info.full_name_display ||
                        epic.assigned_to_extra_info.full_name}
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
            <AlertDialogAction
              onClick={remove}
              className="bg-destructive hover:bg-destructive/90"
            >
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
  const [selected, setSelected] = useState<Epic | null>(null)

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">
          Select a project to view epics
        </div>
      </div>
    )
  }

  if (!viewEnabled(currentProject, "epics")) {
    return <ModuleDisabled view="Epics" slug={slug} />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto p-6">
        <PagePresence>
          {isLoading ? (
            <PageLoading key="loading" label="Loading epics" />
          ) : !epics || epics.length === 0 ? (
            <PageTransition key="empty">
              <div className="flex h-full items-center justify-center">
                <div className="text-muted-foreground">No epics yet</div>
              </div>
            </PageTransition>
          ) : (
            <PageTransition key="epics">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {epics.map((epic) => (
                  <button
                    key={epic.id}
                    onClick={() => setSelected(epic)}
                    className="group cursor-pointer overflow-hidden rounded-lg border bg-card text-left transition-colors hover:border-ring"
                  >
                    <div
                      className="h-1"
                      style={{ backgroundColor: epic.color }}
                    />
                    <div className="p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            #{epic.ref}
                          </span>
                          <span className="text-xs text-muted-foreground/70">
                            {formatRelativeDate(epic.modified_date)}
                          </span>
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
                      <h3 className="mb-1 font-medium transition-colors group-hover:text-primary">
                        {epic.subject}
                      </h3>
                      {epic.description ? (
                        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                          {epic.description}
                        </p>
                      ) : (
                        <p className="mb-4 text-sm text-muted-foreground/70 italic">
                          No description
                        </p>
                      )}
                      <div className="mb-3">
                        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{getProgress(epic)}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-accent">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${getProgress(epic)}%`,
                              backgroundColor: epic.color,
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          <span className="text-foreground">
                            {epic.user_stories_counts?.progress || 0}
                          </span>
                          /{epic.user_stories_counts?.total || 0} stories
                        </span>
                        {epic.assigned_to_extra_info && (
                          <Avatar
                            name={
                              epic.assigned_to_extra_info.full_name_display ||
                              epic.assigned_to_extra_info.full_name
                            }
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
            </PageTransition>
          )}
        </PagePresence>
      </div>

      <EpicDialog
        epic={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        projectId={currentProject.id}
      />
    </div>
  )
}
