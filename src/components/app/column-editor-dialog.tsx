import { useEffect, useState } from "react"
import { DragDropProvider, KeyboardSensor, PointerSensor } from "@dnd-kit/react"
import { PointerActivationConstraints } from "@dnd-kit/dom"
import { useSortable } from "@dnd-kit/react/sortable"
import { GripVertical, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
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
import { bulkUpdateStatusOrder, createStatus, deleteStatus, getStatuses, updateStatus } from "@/lib/api/statuses"
import type { UserStoryStatus } from "@/lib/api/types"

// Same 8px activation threshold as the board: prevents pointer jitter from
// starting accidental column reorder drags.
const columnEditorSensors = [
  PointerSensor.configure({
    activationConstraints: [new PointerActivationConstraints.Distance({ value: 8 })],
  }),
  KeyboardSensor,
]

const presetColors = [
  "#999999", "#70CF97", "#40A8E5", "#F57D7D",
  "#FFC66D", "#C49ADE", "#FF9F43", "#54D1DB",
  "#E8516D", "#8BC34A", "#607D8B", "#FF5722",
]

interface ColumnEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  onUpdated: () => void
}

function StatusRow({
  status,
  index,
  onEdit,
  onDelete,
  canDelete,
}: {
  status: UserStoryStatus
  index: number
  onEdit: () => void
  onDelete: () => void
  canDelete: boolean
}) {
  const { ref, isDragging } = useSortable({ id: status.id, index, group: "statuses" })
  return (
    <div
      ref={ref}
      className={`group flex cursor-grab items-center gap-2 rounded-md p-2 hover:bg-accent ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <GripVertical className="text-muted-foreground/60 h-4 w-4 shrink-0" />
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: status.color || "#666" }} />
      <span className="flex-1 text-sm">{status.name}</span>
      {status.is_closed && (
        <span className="bg-accent text-muted-foreground rounded px-1.5 py-0.5 text-xs">closed</span>
      )}
      <button
        onClick={onEdit}
        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
        title="Edit"
      >
        Edit
      </button>
      {canDelete && (
        <button
          onClick={onDelete}
          className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function ColumnEditorDialog({ open, onOpenChange, projectId, onUpdated }: ColumnEditorDialogProps) {
  const [statuses, setStatuses] = useState<UserStoryStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("#999999")
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")
  const [editIsClosed, setEditIsClosed] = useState(false)
  const [deletingStatus, setDeletingStatus] = useState<UserStoryStatus | null>(null)
  const [moveToId, setMoveToId] = useState<string>("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setIsLoading(true)
    setError("")
    getStatuses(projectId)
      .then((loaded) => setStatuses(loaded.sort((a, b) => a.order - b.order)))
      .catch((err) => setError((err as Error).message))
      .finally(() => setIsLoading(false))
  }, [open, projectId])

  async function addColumn() {
    if (!newName.trim() || isAdding) return
    setIsAdding(true)
    try {
      const maxOrder = statuses.reduce((max, s) => Math.max(max, s.order), 0)
      const created = await createStatus({
        project: projectId,
        name: newName.trim(),
        color: newColor,
        order: maxOrder + 1,
      })
      setStatuses((old) => [...old, created])
      setNewName("")
      setNewColor("#999999")
      onUpdated()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsAdding(false)
    }
  }

  function startEdit(status: UserStoryStatus) {
    setEditingId(status.id)
    setEditName(status.name)
    setEditColor(status.color)
    setEditIsClosed(status.is_closed)
  }

  async function saveEdit() {
    if (editingId === null || !editName.trim()) return
    setSaving(true)
    try {
      const updated = await updateStatus(editingId, {
        name: editName.trim(),
        color: editColor,
        is_closed: editIsClosed,
      })
      setStatuses((old) => old.map((s) => (s.id === updated.id ? updated : s)))
      setEditingId(null)
      onUpdated()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function startDelete(status: UserStoryStatus) {
    setDeletingStatus(status)
    const other = statuses.find((s) => s.id !== status.id)
    setMoveToId(other ? String(other.id) : "")
  }

  async function confirmDelete() {
    if (!deletingStatus || !moveToId) return
    setSaving(true)
    try {
      await deleteStatus(deletingStatus.id, Number(moveToId))
      setStatuses((old) => old.filter((s) => s.id !== deletingStatus.id))
      setDeletingStatus(null)
      onUpdated()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Columns</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive mb-3 rounded px-3 py-2 text-sm">
              {error}
              <button onClick={() => setError("")} className="ml-2 underline">
                dismiss
              </button>
            </div>
          )}

          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading columns...</p>
          ) : (
            <>
              <DragDropProvider
                sensors={columnEditorSensors}
                onDragEnd={(event) => {
                  const { source, target } = event.operation
                  if (!source || !target || source.id === target.id) return
                  const fromId = Number(source.id)
                  const toId = Number(target.id)
                  const list = [...statuses]
                  const from = list.findIndex((s) => s.id === fromId)
                  const to = list.findIndex((s) => s.id === toId)
                  if (from === -1 || to === -1) return
                  const [moved] = list.splice(from, 1)
                  list.splice(to, 0, moved)
                  setStatuses(list)
                  const orderPairs: Array<[number, number]> = list.map((s, i) => [s.id, i + 1])
                  bulkUpdateStatusOrder(projectId, orderPairs)
                    .then(() => {
                      setStatuses(list.map((s, i) => ({ ...s, order: i + 1 })))
                      onUpdated()
                    })
                    .catch((err) => {
                      setError((err as Error).message)
                      getStatuses(projectId)
                        .then((loaded) => setStatuses(loaded.sort((a, b) => a.order - b.order)))
                        .catch(() => undefined)
                    })
                }}
              >
                <div className="space-y-1">
                  {statuses.map((status, i) =>
                    editingId === status.id ? (
                      <div key={status.id} className="border-accent bg-accent/50 flex items-center gap-2 rounded-md border p-2">
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent"
                        />
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 flex-1 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit()
                            if (e.key === "Escape") setEditingId(null)
                          }}
                          autoFocus
                        />
                        <label className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Checkbox checked={editIsClosed} onCheckedChange={(v) => setEditIsClosed(v === true)} />
                          Closed
                        </label>
                        <Button variant="ghost" size="sm" onClick={saveEdit} disabled={saving}>
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <StatusRow
                        key={status.id}
                        status={status}
                        index={i}
                        onEdit={() => startEdit(status)}
                        onDelete={() => startDelete(status)}
                        canDelete={statuses.length > 1}
                      />
                    )
                  )}
                </div>
              </DragDropProvider>

              <div className="mt-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent"
                  />
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="New column name..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addColumn()
                    }}
                  />
                  <Button onClick={addColumn} disabled={!newName.trim() || isAdding}>
                    {isAdding ? "..." : "Add"}
                  </Button>
                </div>
                <div className="mt-2 flex gap-1 pl-9">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: newColor === color ? "#fff" : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {deletingStatus && (
          <div className="bg-background/95 absolute inset-0 flex items-center justify-center rounded-lg p-6">
            <div className="max-w-sm space-y-4 text-center">
              <h3 className="font-medium">Delete "{deletingStatus.name}"?</h3>
              <p className="text-muted-foreground text-sm">Stories in this column will be moved to:</p>
              <Select value={moveToId} onValueChange={(v) => setMoveToId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses
                    .filter((s) => s.id !== deletingStatus.id)
                    .map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="flex justify-center gap-3">
                <Button variant="ghost" onClick={() => setDeletingStatus(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmDelete} disabled={saving || !moveToId}>
                  {saving ? "Deleting..." : "Delete Column"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
