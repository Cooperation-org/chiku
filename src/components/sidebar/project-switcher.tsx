import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  Check,
  ChevronsUpDown,
  CirclePlus,
  Settings2,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

import { Avatar } from "@/components/app/avatar"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
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
  /** Slug of the project currently in view. */
  slug: string
}

/**
 * The sidebar-header team switcher, shadcn style: the active project as a
 * compact button, the full project list plus New project / Project settings
 * in the dropdown. The one place where projects are switched and managed.
 */
export function ProjectSwitcher({ slug }: ProjectSwitcherProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const setSelectedSlug = useProjectStore((s) => s.setSelectedSlug)
  const { data: projects, isPending: projectsLoading } = useProjects()

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
    navigate({ to: "/projects/$slug/board", params: { slug: nextSlug } })
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

    // Optimistic temp project so the dropdown updates instantly.
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
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                />
              }
            >
              <Avatar
                name={current?.name}
                variant="marble"
                size="sm"
                className="text-white"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{current?.name ?? (projectsLoading ? <Skeleton className="h-4 w-24" /> : "No project")}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {current?.description || "Project"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-56 rounded-lg" align="start" side="bottom" sideOffset={4}>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Projects</DropdownMenuLabel>
                {activeProjects.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => switchTo(p.slug)}
                    className={p.slug === slug ? "bg-accent" : ""}
                  >
                    <Avatar name={p.name} variant="marble" size="sm" className="text-white" />
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    {p.slug === slug && <Check className="h-4 w-4 shrink-0" />}
                  </DropdownMenuItem>
                ))}
                {activeProjects.length === 0 && (
                  <div className="text-muted-foreground px-2 py-2 text-xs">No projects yet</div>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            <DropdownMenuItem onClick={openSettings} disabled={!current}>
              <Settings2 className="h-4 w-4" /> Project settings
            </DropdownMenuItem>
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
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>

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
