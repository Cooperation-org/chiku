import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { DragDropProvider } from "@dnd-kit/react"
import { useSortable } from "@dnd-kit/react/sortable"
import { motion, AnimatePresence } from "motion/react"
import { toast } from "sonner"
import { CirclePlus, EllipsisVertical } from "lucide-react"

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useProjects } from "@/lib/queries/projects"
import { isArchived } from "@/lib/api/projects"
import { createStatus, deleteStatus, getStatuses } from "@/lib/api/statuses"
import { createProject, updateProject, deleteProject } from "@/lib/api/projects"
import { qk, queryClient } from "@/lib/query"
import { useProjectStore } from "@/lib/stores/project"
import { useAuth } from "@/lib/stores/auth"
import { useSidebarStore } from "@/lib/stores/sidebar"
import type { Project } from "@/lib/api/types"

interface ProjectsSectionProps {
  /** Slug of the project the visitor is currently looking at. */
  activeSlug: string | null
  /** Close the mobile sheet after navigating. */
  onNavigate: () => void
}

export function ProjectsSection({ activeSlug, onNavigate }: ProjectsSectionProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const setSelectedSlug = useProjectStore((s) => s.setSelectedSlug)
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen)

  const { data: projects } = useProjects()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [cloneFrom, setCloneFrom] = useState("none")
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [deleting, setDeleting] = useState<Project | null>(null)

  const activeProjects = projects?.filter((p) => !isArchived(p)) ?? []

  function openProject(project: Project) {
    setSelectedSlug(project.slug)
    setMobileOpen(false)
    onNavigate()
    navigate({ to: "/p/$slug/board", params: { slug: project.slug } })
  }

  async function toggleArchive(project: Project) {
    const archived = isArchived(project)
    const updatedTags = archived
      ? (project.tags || []).filter((t) => t.toLowerCase() !== "archived")
      : [...(project.tags || []), "archived"]
    queryClient.setQueryData<Project[]>(qk.projects, (old) =>
      old?.map((p) => (p.id === project.id ? { ...p, tags: updatedTags } : p))
    )
    try {
      const updated = archived ? await import("@/lib/api/projects").then((m) => m.unarchiveProject(project)) : await import("@/lib/api/projects").then((m) => m.archiveProject(project))
      queryClient.setQueryData<Project[]>(qk.projects, (old) =>
        old?.map((p) => (p.id === updated.id ? updated : p))
      )
    } catch (err) {
      toast.error(`Failed to update project: ${(err as Error).message}`)
      queryClient.invalidateQueries({ queryKey: qk.projects })
    }
  }

  async function handleCreateProject() {
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    const cloneFromProjectId = cloneFrom !== "none" ? Number(cloneFrom) : null

    // Optimistic temp project so the list updates instantly.
    const tempId = -Date.now()
    const tempProject: Project = {
      id: tempId,
      name,
      description: newDesc.trim(),
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      created_date: new Date().toISOString(),
      modified_date: new Date().toISOString(),
      owner: user as never,
      members: [],
      is_private: false,
      total_milestones: 0,
      total_story_points: 0,
      is_kanban_activated: true,
      is_backlog_activated: true,
      is_epics_activated: true,
      is_issues_activated: true,
      is_wiki_activated: true,
      us_statuses: [],
      task_statuses: [],
      points: [],
      roles: [],
      tags: [],
      tags_colors: {},
    }
    queryClient.setQueryData<Project[]>(qk.projects, (old) => [tempProject, ...(old ?? [])])
    setShowCreate(false)

    try {
      const newProject = await createProject({ name, description: newDesc.trim(), is_private: false })

      // Clone columns from the chosen source project.
      if (cloneFromProjectId) {
        try {
          const sourceStatuses = (await getStatuses(cloneFromProjectId)).sort((a, b) => a.order - b.order)
          const defaultStatusIds = (await getStatuses(newProject.id)).map((s) => s.id)
          let firstClonedId: number | null = null
          for (const ss of sourceStatuses) {
            const created = await createStatus({
              project: newProject.id,
              name: ss.name,
              color: ss.color,
              is_closed: ss.is_closed,
              order: ss.order,
            })
            if (!firstClonedId) firstClonedId = created.id
          }
          if (firstClonedId) {
            for (const defId of defaultStatusIds) {
              try {
                await deleteStatus(defId, firstClonedId)
              } catch (e) {
                console.warn("Could not remove default status", defId, e)
              }
            }
          }
        } catch (cloneErr) {
          console.error("Failed to clone columns (project created with defaults):", cloneErr)
        }
      }

      queryClient.setQueryData<Project[]>(qk.projects, (old) =>
        old?.map((p) => (p.id === tempId ? newProject : p))
      )
      openProject(newProject)
    } catch (err) {
      queryClient.setQueryData<Project[]>(qk.projects, (old) => old?.filter((p) => p.id !== tempId))
      toast.error(`Failed to create project: ${(err as Error).message}`)
    } finally {
      setCreating(false)
    }
  }

  async function handleEditProject() {
    if (!editing || !editName.trim()) return
    try {
      const updated = await updateProject(editing.id, { name: editName.trim(), description: editDesc.trim() })
      queryClient.setQueryData<Project[]>(qk.projects, (old) =>
        old?.map((p) => (p.id === updated.id ? updated : p))
      )
      setEditing(null)
    } catch (err) {
      toast.error(`Failed to update project: ${(err as Error).message}`)
    }
  }

  async function handleDeleteProject() {
    if (!deleting) return
    const projectId = deleting.id
    try {
      await deleteProject(projectId)
      queryClient.setQueryData<Project[]>(qk.projects, (old) => old?.filter((p) => p.id !== projectId))
      setDeleting(null)
      if (activeSlug === deleting.slug) {
        navigate({ to: "/" })
      }
    } catch (err) {
      toast.error(`Failed to delete project: ${(err as Error).message}`)
    }
  }

  return (
    <>
      <DragDropProvider
        onDragEnd={(event) => {
          const { source, target } = event.operation
          if (!source || !target || source.id === target.id) return
          if (!projects) return
          const fromId = Number(source.id)
          const toId = Number(target.id)
          const list = [...projects]
          const from = list.findIndex((p) => p.id === fromId)
          const to = list.findIndex((p) => p.id === toId)
          if (from === -1 || to === -1) return
          const [moved] = list.splice(from, 1)
          list.splice(to, 0, moved)
          queryClient.setQueryData<Project[]>(qk.projects, (old) => {
            const others = old?.filter((p) => !list.some((lp) => lp.id === p.id)) ?? []
            return [...list.map((p, i) => ({ ...p, _order: i })), ...others]
          })
          import("@/lib/api/projects").then((m) =>
            m
              .reorderProjects(list.map((p, i) => ({ project_id: p.id, order: i })))
              .catch((err) => toast.error(`Failed to save order: ${(err as Error).message}`))
          )
        }}
      >
        <div className="space-y-0.5">
        <AnimatePresence initial={false}>
          {(projects ?? []).map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ProjectRow
                project={project}
                index={i}
                active={activeSlug === project.slug}
                onSelect={() => openProject(project)}
                onEdit={() => {
                  setEditing(project)
                  setEditName(project.name)
                  setEditDesc(project.description || "")
                }}
                onToggleArchive={() => toggleArchive(project)}
                onDelete={() => setDeleting(project)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {(projects ?? []).length === 0 && (
          <div className="text-sidebar-foreground/60 px-2 py-2 text-center text-xs">No projects yet</div>
        )}
      </div>
      </DragDropProvider>

      <Button
        variant="ghost"
        size="sm"
        className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground mt-1 h-8 w-full justify-start gap-2 px-2 text-sm"
        onClick={() => {
          setNewName("")
          setNewDesc("")
          setCloneFrom("none")
          setShowCreate(true)
        }}
      >
        <CirclePlus className="h-4 w-4" />
        New project
      </Button>

      {/* Create project */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-desc">Description</Label>
              <Textarea
                id="project-desc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brief description (optional)"
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Copy columns from</Label>
              <Select value={cloneFrom} onValueChange={(v) => setCloneFrom(v ?? "none")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default columns</SelectItem>
                  {activeProjects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={!newName.trim() || creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit project */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-project-name">Name</Label>
              <Input
                id="edit-project-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-project-desc">Description</Label>
              <Textarea
                id="edit-project-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditProject}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete project */}
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleting?.name}</strong>? This action cannot be
              undone. All issues in this project will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
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

function ProjectRow({
  project,
  index,
  active,
  onSelect,
  onEdit,
  onToggleArchive,
  onDelete,
}: {
  project: Project
  index: number
  active: boolean
  onSelect: () => void
  onEdit: () => void
  onToggleArchive: () => void
  onDelete: () => void
}) {
  const { ref, isDragging } = useSortable({ id: project.id, index, group: "projects" })

  return (
    <div
      ref={ref}
      className={`group/row flex items-center rounded-md transition-colors ${
        active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <button
        onClick={onSelect}
        className={`flex-1 truncate px-2 py-1.5 text-left text-sm ${
          active ? "text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:text-sidebar-foreground"
        }`}
        title={project.name}
      >
        {project.name}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              className="mr-1 shrink-0 rounded p-1 text-sidebar-foreground/60 opacity-0 transition-opacity hover:text-sidebar-foreground group-hover/row:opacity-100"
              title="Project menu"
            />
          }
        >
          <EllipsisVertical className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleArchive}>
            {isArchived(project) ? "Unarchive" : "Archive"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
