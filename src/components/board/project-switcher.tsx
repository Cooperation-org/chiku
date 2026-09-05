import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { ChevronDown, CirclePlus, Settings2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProjectSelect } from "@/components/inputs/project-select"
import { useProjects } from "@/lib/queries/projects"
import { isArchived } from "@/lib/api/projects"
import { createStatus, deleteStatus, getStatuses } from "@/lib/api/statuses"
import {
  archiveProject,
  createProject,
  deleteProject,
  unarchiveProject,
  updateProject,
} from "@/lib/api/projects"
import { qk, queryClient } from "@/lib/query"
import { useProjectStore } from "@/lib/stores/project"
import { useAuth } from "@/lib/stores/auth"
import type { Project } from "@/lib/api/types"

interface ProjectSwitcherProps {
  slug: string
}

/**
 * The furthest-left control of the consolidated bar: the one and only place
 * where projects are switched, created and managed.
 */
export function ProjectSwitcher({ slug }: ProjectSwitcherProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const setSelectedSlug = useProjectStore((s) => s.setSelectedSlug)
  const { data: projects } = useProjects()

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [cloneFrom, setCloneFrom] = useState("none")
  const [creating, setCreating] = useState(false)

  const [showSettings, setShowSettings] = useState(false)
  const [settingsName, setSettingsName] = useState("")
  const [settingsDesc, setSettingsDesc] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  const activeProjects = (projects ?? []).filter((p) => !isArchived(p))
  const current = activeProjects.find((p) => p.slug === slug)

  function switchTo(nextSlug: string) {
    setSelectedSlug(nextSlug)
    navigate({ to: "/p/$slug/board", params: { slug: nextSlug } })
  }

  function goHome() {
    navigate({ to: "/" })
  }

  function openSettings() {
    if (!current) return
    setSettingsName(current.name)
    setSettingsDesc(current.description || "")
    setConfirmDelete(false)
    setShowSettings(true)
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
      switchTo(newProject.slug)
    } catch (err) {
      queryClient.setQueryData<Project[]>(qk.projects, (old) => old?.filter((p) => p.id !== tempId))
      toast.error(`Failed to create project: ${(err as Error).message}`)
    } finally {
      setCreating(false)
    }
  }

  async function handleSaveSettings() {
    if (!current || !settingsName.trim() || busy) return
    setBusy(true)
    try {
      const updated = await updateProject(current.id, {
        name: settingsName.trim(),
        description: settingsDesc.trim(),
      })
      queryClient.setQueryData<Project[]>(qk.projects, (old) =>
        old?.map((p) => (p.id === updated.id ? updated : p))
      )
      setShowSettings(false)
    } catch (err) {
      toast.error(`Failed to update project: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleArchiveToggle() {
    if (!current || busy) return
    setBusy(true)
    const archived = isArchived(current)
    const updatedTags = archived
      ? (current.tags || []).filter((t) => t.toLowerCase() !== "archived")
      : [...(current.tags || []), "archived"]
    queryClient.setQueryData<Project[]>(qk.projects, (old) =>
      old?.map((p) => (p.id === current.id ? { ...p, tags: updatedTags } : p))
    )
    try {
      const updated = archived ? await unarchiveProject(current) : await archiveProject(current)
      queryClient.setQueryData<Project[]>(qk.projects, (old) =>
        old?.map((p) => (p.id === updated.id ? updated : p))
      )
      setShowSettings(false)
      if (!archived) goHome()
    } catch (err) {
      toast.error(`Failed to update project: ${(err as Error).message}`)
      queryClient.invalidateQueries({ queryKey: qk.projects })
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!current || busy) return
    setBusy(true)
    const projectId = current.id
    try {
      await deleteProject(projectId)
      queryClient.setQueryData<Project[]>(qk.projects, (old) => old?.filter((p) => p.id !== projectId))
      setConfirmDelete(false)
      setShowSettings(false)
      goHome()
    } catch (err) {
      toast.error(`Failed to delete project: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" className="h-9 min-w-44 justify-between gap-1 font-medium" />
          }
        >
          <span className="truncate">{current?.name ?? "Switch project"}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Switch project</DropdownMenuLabel>
            {activeProjects.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => switchTo(p.slug)}
                className={p.slug === slug ? "bg-accent" : ""}
              >
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
              </DropdownMenuItem>
            ))}
            {activeProjects.length === 0 && (
              <div className="text-muted-foreground px-2 py-2 text-xs">No projects yet</div>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setNewName("")
              setNewDesc("")
              setCloneFrom("none")
              setShowCreate(true)
            }}
          >
            <CirclePlus className="h-4 w-4" /> New project
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openSettings} disabled={!current}>
            <Settings2 className="h-4 w-4" /> Project settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
              <ProjectSelect
                value={cloneFrom}
                onValueChange={setCloneFrom}
                includeNone
                noneLabel="Default columns"
              />
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

      {/* Project settings â€” edit, archive, delete for the current project */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Project settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-settings-name">Name</Label>
              <Input
                id="project-settings-name"
                value={settingsName}
                onChange={(e) => setSettingsName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-settings-desc">Description</Label>
              <Textarea
                id="project-settings-desc"
                value={settingsDesc}
                onChange={(e) => setSettingsDesc(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" /> Delete project
              </Button>
              {current && isArchived(current) && (
                <Button variant="outline" size="sm" onClick={handleArchiveToggle} disabled={busy}>
                  Unarchive
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} disabled={busy || !settingsName.trim()}>
              {busy ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Delete <strong>{current?.name}</strong> permanently? All issues in this project will be
            removed. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
