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

  function signOut() {
    logout()
    navigate({ to: "/login" })
  }

  return (
    <div className="text-sidebar-foreground flex h-full flex-col">
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
            <SidebarSection id="views" label="Views">
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
          </>
        )}
      </div>

      {/* Footer: fixed-size controls, nothing overflows */}
      <div className="border-t p-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => setShowProfile(true)}
              className="hover:bg-sidebar-accent flex h-8 w-8 items-center justify-center rounded-md transition-colors"
              title="Your profile"
            >
              <Avatar
                name={user?.full_name || user?.username}
                photo={user?.photo}
                color={user?.color || "#22d3ee"}
                size="sm"
                className="text-zinc-900"
              />
            </button>
            <FooterIconButton
              icon={theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              label="Toggle theme"
              onClick={toggle}
            />
            <FooterIconButton icon={<LogOut className="h-4 w-4" />} label="Sign out" onClick={signOut} />
            <FooterIconButton
              icon={<PanelLeftOpen className="h-4 w-4" />}
              label="Expand sidebar"
              onClick={() => useSidebarStore.getState().toggle()}
            />
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowProfile(true)}
              className="hover:bg-sidebar-accent flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
              title="Edit your name and icon"
            >
              <Avatar
                name={user?.full_name || user?.username}
                photo={user?.photo}
                color={user?.color || "#22d3ee"}
                size="sm"
                className="shrink-0 text-zinc-900"
              />
              <span className="text-sidebar-foreground/80 min-w-0 flex-1 truncate text-sm">
                {user?.full_name_display || user?.username || "Signed in"}
              </span>
            </button>
            <div className="mt-1 flex items-center justify-end gap-0.5">
              <FooterIconButton
                icon={theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                label="Toggle theme"
                onClick={toggle}
              />
              <FooterIconButton icon={<LogOut className="h-4 w-4" />} label="Sign out" onClick={signOut} />
              <FooterIconButton
                icon={<PanelLeftClose className="h-4 w-4" />}
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

function FooterIconButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors [&_svg]:h-4 [&_svg]:w-4"
    >
      {icon}
    </button>
  )
}
