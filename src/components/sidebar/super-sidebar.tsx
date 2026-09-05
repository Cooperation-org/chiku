import { useState } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import {
  KanbanSquare,
  Layers,
  LineChart,
  ListTodo,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Rows3,
  Sun,
  Users,
} from "lucide-react"

import { Avatar } from "@/components/app/avatar"
import { SidebarItem } from "@/components/sidebar/sidebar-item"
import { SidebarSection } from "@/components/sidebar/sidebar-section"
import { ProjectsSection } from "@/components/sidebar/projects-section"
import { ProfileDialog } from "@/components/app/profile-dialog"
import { MembersDialog } from "@/components/app/members-dialog"
import { useAuth } from "@/lib/stores/auth"
import { useTheme } from "@/lib/stores/theme"
import { useSidebarStore } from "@/lib/stores/sidebar"
import { useProjectStore } from "@/lib/stores/project"
import { useProjectBySlug } from "@/lib/queries/projects"
import type { Project } from "@/lib/api/types"

function viewEnabled(project: Project | null, view: "board" | "backlog" | "epics" | "velocity"): boolean {
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

interface SuperSidebarProps {
  /** Close the mobile sheet after a navigation. */
  onNavigate: () => void
  /** Desktop icon-rail mode. */
  collapsed: boolean
}

export function SuperSidebar({ onNavigate, collapsed }: SuperSidebarProps) {
  const navigate = useNavigate()
  const params = useParams({ strict: false })
  const { user } = useAuth()
  const logout = useAuth((s) => s.logout)
  const { theme, toggle } = useTheme()
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen)
  const setSelectedSlug = useProjectStore((s) => s.setSelectedSlug)

  const [showProfile, setShowProfile] = useState(false)
  const [showMembers, setShowMembers] = useState(false)

  const urlSlug = (params as { slug?: string }).slug ?? null
  const selectedSlug = useProjectStore((s) => s.selectedSlug)
  const { project } = useProjectBySlug(urlSlug ?? selectedSlug ?? undefined)

  function go(to: string, slug?: string) {
    if (slug) setSelectedSlug(slug)
    setMobileOpen(false)
    onNavigate()
    navigate({ to, params: slug ? { slug } : undefined })
  }

  function projectView(view: "board" | "backlog" | "epics" | "velocity") {
    const slug = urlSlug ?? selectedSlug
    if (!slug) return
    go(`/p/${slug}/${view}`, slug)
  }

  const views = [
    { key: "board", label: "Board", icon: <KanbanSquare />, enabled: viewEnabled(project, "board") },
    { key: "backlog", label: "Backlog", icon: <Rows3 />, enabled: viewEnabled(project, "backlog") },
    { key: "epics", label: "Epics", icon: <Layers />, enabled: viewEnabled(project, "epics") },
    { key: "velocity", label: "Velocity", icon: <LineChart />, enabled: viewEnabled(project, "velocity") },
  ] as const

  // Deterministic identicon colour per project, GitLab style.
  const identiconPalette = ["#40A8E5", "#54D1DB", "#70CF97", "#FFC66D", "#FF9F43", "#F57D7D", "#C49ADE"]
  const identiconColor = project ? identiconPalette[project.id % identiconPalette.length] : "#29c033"

  return (
    <div className="text-sidebar-foreground flex h-full flex-col">
      {/* Context header — the current project, click goes to its board */}
      <div className="border-b p-3">
        <SidebarItem
          collapsed={collapsed}
          icon={
            <Avatar
              name={project?.name}
              color={identiconColor}
              size="sm"
              className="text-white"
            />
          }
          label={project?.name ?? "TaigaLT"}
          onClick={() => (urlSlug ? go(`/p/${urlSlug}/board`, urlSlug) : go("/"))}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
        {collapsed ? (
          <>
            {views.map((v) => (
              <SidebarItem
                key={v.key}
                collapsed
                icon={v.icon}
                label={v.label}
                disabled={!v.enabled}
                onClick={() => projectView(v.key)}
              />
            ))}
            <SidebarItem collapsed icon={<ListTodo />} label="My Tasks" onClick={() => go("/tasks")} />
          </>
        ) : (
          <>
            <SidebarSection id="pinned" label="Views">
              {views.map((v) => (
                <SidebarItem
                  key={v.key}
                  icon={v.icon}
                  label={v.label}
                  disabled={!v.enabled}
                  onClick={() => projectView(v.key)}
                />
              ))}
            </SidebarSection>

            <SidebarSection id="general" label="General">
              <SidebarItem icon={<ListTodo />} label="My Tasks" onClick={() => go("/tasks")} />
              <SidebarItem
                icon={<Users />}
                label="Members"
                disabled={!project}
                onClick={() => setShowMembers(true)}
              />
            </SidebarSection>

            <SidebarSection id="projects" label="Projects">
              <ProjectsSection activeSlug={urlSlug ?? selectedSlug} onNavigate={onNavigate} />
            </SidebarSection>
          </>
        )}
      </div>

      <div className="border-t p-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <SidebarItem collapsed icon={theme === "dark" ? <Sun /> : <Moon />} label="Toggle theme" onClick={toggle} />
            <SidebarItem collapsed icon={<LogOut />} label="Sign out" onClick={() => { logout(); navigate({ to: "/login" }) }} />
            <SidebarItem collapsed icon={<PanelLeftOpen />} label="Expand sidebar" onClick={() => useSidebarStore.getState().toggle()} />
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowProfile(true)}
              className="hover:bg-sidebar-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
              title="Edit your name and icon"
            >
              <Avatar
                name={user?.full_name || user?.username}
                photo={user?.photo}
                color={user?.color || "#22d3ee"}
                size="sm"
                className="text-zinc-900"
              />
              <span className="text-sidebar-foreground/80 min-w-0 flex-1 truncate text-sm">
                {user?.full_name_display || user?.username}
              </span>
            </button>
            <div className="mt-1 flex items-center justify-between">
              <SidebarItem icon={theme === "dark" ? <Sun /> : <Moon />} label="Theme" onClick={toggle} />
              <SidebarItem
                icon={<LogOut />}
                label="Sign out"
                onClick={() => {
                  logout()
                  navigate({ to: "/login" })
                }}
              />
              <SidebarItem
                icon={<PanelLeftClose />}
                label="Collapse sidebar"
                onClick={() => useSidebarStore.getState().toggle()}
              />
            </div>
          </>
        )}
      </div>

      <ProfileDialog
        open={showProfile}
        onOpenChange={setShowProfile}
        onUpdated={(me) =>
          useAuth.getState().setProfile({
            full_name: me.full_name,
            full_name_display: me.full_name_display,
            photo: me.photo,
            color: me.color,
          })
        }
      />
      {project && <MembersDialog open={showMembers} onOpenChange={setShowMembers} project={project} />}
    </div>
  )
}
