import { useMemo, useState } from "react"
import { useNavigate, useParams, useRouterState } from "@tanstack/react-router"
import { DragDropProvider } from "@dnd-kit/react"
import { useSortable } from "@dnd-kit/react/sortable"
import { motion, AnimatePresence } from "motion/react"
import { toast } from "sonner"
import { CirclePlus, EllipsisVertical, LogOut, Moon, Sun, Users } from "lucide-react"

import { Avatar } from "@/components/app/avatar"
import { BrandLogo } from "@/components/app/brand-logo"
import { CohortNav } from "@/components/app/cohort-nav"
import { MembersDialog } from "@/components/app/members-dialog"
import { ProfileDialog } from "@/components/app/profile-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
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

import { useAuth } from "@/lib/stores/auth"
import { useTheme } from "@/lib/stores/theme"
import { useProjectStore } from "@/lib/stores/project"
import { useProjects } from "@/lib/queries/projects"
import { isArchived } from "@/lib/api/projects"
import { createStatus, deleteStatus, getStatuses } from "@/lib/api/statuses"
import { createProject, updateProject } from "@/lib/api/projects"
import { queryClient, qk } from "@/lib/query"
import type { Project } from "@/lib/api/types"

function isViewAvailable(project: Project | null, view: "board" | "backlog" | "epics" | "velocity"): boolean {
  if (!project) return true
  switch (view) {
    case "board":
      return project.is_kanban_activated !== false
    case "backlog":
      return project.is_backlog_activated !== false
    case "epics":
      return project.is_epics_activated !== false
    case "velocity":
      return project.is_backlog_activated !== false
  }
}

function ProjectRow({
  project,
  selected,
  onSelect,
  onEdit,
  onToggleArchive,
  onDelete,
  index,
}: {
  project: Project
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onToggleArchive: () => void
  onDelete: () => void
  index: number
}) {
  const { ref, isDragging } = useSortable({ id: project.id, index, group: "projects" })

  return (
    <div
      ref={ref}
      className={`group/row flex items-center rounded transition-colors ${
        selected ? "bg-accent" : "hover:bg-accent/60"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <button
        onClick={onSelect}
        className={`flex-1 truncate px-2 py-1.5 text-left text-sm ${
          selected ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
        title={project.name}
      >
        {project.name}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              className="mr-1 shrink-0 rounded p-1 text-muted-foreground/60 opacity-0 transition-opacity hover:text-foreground group-hover/row:opacity-100"
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

export function Shell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const params = useParams({ strict: false })
  const { user } = useAuth()
  const logout = useAuth((s) => s.logout)
  const { theme, toggle } = useTheme()
  const { currentProject, setProject } = useProjectStore()

  const { data: projects, isLoading: projectsLoading } = useProjects()
  const [showArchived, setShowArchived] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showMembers, setShowMembers] = useState(false)

  // Create project dialog state
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [cloneFrom, setCloneFrom] = useState<string>("none")
  const [creating, setCreating] = useState(false)

  // Edit project dialog state
  const [editing, setEditing] = useState<Project | null>(null)
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [deleting, setDeleting] = useState<Project | null>(null)

  const activeProjects = useMemo(() => projects?.filter((p) => !isArchived(p)) ?? [], [projects])
  const archivedProjects = useMemo(() => projects?.filter((p) => isArchived(p)) ?? [], [projects])
  const displayedProjects = showArchived ? archivedProjects : activeProjects

  const urlSlug = (params as { slug?: string }).slug ?? null

  function selectProject(project: Project) {
    setProject(project)
    navigate({ to: "/p/$slug/board", params: { slug: project.slug } })
  }

  function handleLogout() {
    logout()
    navigate({ to: "/login" })
  }

  async function toggleArchive(project: Project) {
    const archived = isArchived(project)
    const updatedTags = archived
      ? (project.tags || []).filter((t) => t.toLowerCase() !== "archived")
      : [...(project.tags || []), "archived"]
    // Optimistic
    queryClient.setQueryData<Project[]>(qk.projects, (old) =>
      old?.map((p) => (p.id === project.id ? { ...p, tags: updatedTags } : p))
    )
    try {
      const { archiveProject, unarchiveProject } = await import("@/lib/api/projects")
      const updated = archived ? await unarchiveProject(project) : await archiveProject(project)
      queryClient.setQueryData<Project[]>(qk.projects, (old) =>
        old?.map((p) => (p.id === updated.id ? updated : p))
      )
      if (archived) {
        setProject(updated)
        navigate({ to: "/p/$slug/board", params: { slug: updated.slug } })
      } else if (currentProject?.id === project.id) {
        const active = (projects ?? []).filter((p) => !isArchived(p) && p.id !== project.id)
        if (active.length > 0) {
          setProject(active[0])
          navigate({ to: "/p/$slug/board", params: { slug: active[0].slug } })
        } else {
          setProject(null)
          navigate({ to: "/" })
        }
      }
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

    // Optimistic temp project so the sidebar updates instantly (old behaviour).
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
      setProject(newProject)
      navigate({ to: "/p/$slug/board", params: { slug: newProject.slug } })
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
      if (currentProject?.id === updated.id) setProject(updated)
      setEditing(null)
    } catch (err) {
      toast.error(`Failed to update project: ${(err as Error).message}`)
    }
  }

  async function handleDeleteProject() {
    if (!deleting) return
    const projectId = deleting.id
    try {
      const { deleteProject } = await import("@/lib/api/projects")
      await deleteProject(projectId)
      queryClient.setQueryData<Project[]>(qk.projects, (old) => old?.filter((p) => p.id !== projectId))
      if (currentProject?.id === projectId) {
        const active = (projects ?? []).filter((p) => !isArchived(p) && p.id !== projectId)
        if (active.length > 0) {
          setProject(active[0])
          navigate({ to: "/p/$slug/board", params: { slug: active[0].slug } })
        } else {
          setProject(null)
          navigate({ to: "/" })
        }
      }
      setDeleting(null)
    } catch (err) {
      toast.error(`Failed to delete project: ${(err as Error).message}`)
    }
  }

  const currentView = pathname.replace(/^\/p\/[^/]+/, "") || "/board"
  const org = currentProject?.slug || urlSlug

  return (
    <>
      <CohortNav org={org} />
      <div className="bg-background flex min-h-[calc(100vh-32px)]">
        <aside className="bg-sidebar text-sidebar-foreground flex w-56 flex-col border-r">
          <div className="border-b p-4">
            <a href="/" className="flex items-center gap-2">
              <BrandLogo className="h-8 w-8" />
              <span className="text-sm font-semibold">TaigaLT</span>
            </a>
          </div>

          <div className="flex min-h-0 flex-1 flex-col border-b">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Projects
              </span>
              <button
                onClick={() => {
                  setNewName("")
                  setNewDesc("")
                  setCloneFrom("none")
                  setShowCreate(true)
                }}
                className="hover:bg-accent rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                title="New project"
              >
                <CirclePlus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-between px-3 pb-1">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="text-muted-foreground hover:text-foreground rounded px-1 py-0.5 text-xs transition-colors"
              >
                {showArchived ? "Archived" : "Active"} ({showArchived ? archivedProjects.length : activeProjects.length})
              </button>
            </div>
            <DragDropProvider
              onDragEnd={(event) => {
                const { source, target } = event.operation
                if (!source || !target || source.id === target.id) return
                if (!displayedProjects) return
                const fromId = Number(source.id)
                const toId = Number(target.id)
                const list = [...displayedProjects]
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
              <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
                {projectsLoading && <div className="p-2 text-xs text-muted-foreground">Loadingâ€¦</div>}
                <AnimatePresence initial={false}>
                  {displayedProjects.map((project, i) => (
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
                        selected={currentProject?.id === project.id}
                        onSelect={() => selectProject(project)}
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
                {!projectsLoading && displayedProjects.length === 0 && (
                  <div className="text-muted-foreground/60 px-2 py-4 text-center text-sm">
                    {showArchived ? "No archived projects" : "No active projects"}
                  </div>
                )}
              </div>
            </DragDropProvider>
          </div>

          <nav className="space-y-1 p-2">
            <SidebarLink href="/tasks" active={pathname === "/tasks"} label="My Tasks" />
            <div className="my-1 border-t" />
            <SidebarLink
              href={currentProject ? `/p/${currentProject.slug}/board` : "/"}
              active={currentView === "/board"}
              label="Board"
              disabled={!isViewAvailable(currentProject, "board")}
            />
            <SidebarLink
              href={currentProject ? `/p/${currentProject.slug}/backlog` : "/"}
              active={currentView === "/backlog"}
              label="Backlog"
              disabled={!isViewAvailable(currentProject, "backlog")}
            />
            <SidebarLink
              href={currentProject ? `/p/${currentProject.slug}/epics` : "/"}
              active={currentView === "/epics"}
              label="Epics"
              disabled={!isViewAvailable(currentProject, "epics")}
            />
            <SidebarLink
              href={currentProject ? `/p/${currentProject.slug}/velocity` : "/"}
              active={currentView === "/velocity"}
              label="Velocity"
              disabled={!isViewAvailable(currentProject, "velocity")}
            />
            <Button
              variant="ghost"
              disabled={!currentProject}
              onClick={() => setShowMembers(true)}
              className="text-muted-foreground hover:text-foreground w-full justify-start gap-2 px-3 text-sm"
            >
              <Users className="h-4 w-4" />
              Members
            </Button>
          </nav>

          <div className="border-t p-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowProfile(true)}
                className="hover:bg-accent flex min-w-0 items-center gap-2 rounded-md px-1 py-1 text-left transition-colors"
                title="Edit your name and icon"
              >
                <Avatar
                  name={user?.full_name || user?.username}
                  photo={user?.photo}
                  color={user?.color || "#22d3ee"}
                  size="sm"
                  className="text-zinc-900"
                />
                <span className="text-muted-foreground truncate text-sm">{user?.username}</span>
              </button>
              <div className="flex items-center">
                <button
                  onClick={toggle}
                  className="text-muted-foreground hover:text-foreground rounded p-1.5 transition-colors"
                  title="Toggle theme"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <button
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-foreground rounded p-1.5 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>

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
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-muted-foreground text-xs">
                Press <kbd className="rounded bg-accent px-1">Cmd+Enter</kbd> to create
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProject} disabled={!newName.trim() || creating}>
                  {creating ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
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
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditProject}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete project */}
        <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{deleting?.name}</strong>? This action cannot
                be undone. All issues in this project will be permanently deleted.
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

        <ProfileDialog open={showProfile} onOpenChange={setShowProfile} onUpdated={(me) => useAuth.getState().setProfile({ full_name: me.full_name, full_name_display: me.full_name_display, photo: me.photo, color: me.color })} />
        {currentProject && (
          <MembersDialog open={showMembers} onOpenChange={setShowMembers} project={currentProject} />
        )}
      </div>
    </>
  )
}

function SidebarLink({
  href,
  active,
  label,
  disabled,
}: {
  href: string
  active: boolean
  label: string
  disabled?: boolean
}) {
  const navigate = useNavigate()
  if (disabled) return null
  return (
    <button
      onClick={() => navigate({ to: href })}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {label}
    </button>
  )
}
