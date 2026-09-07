import { useNavigate, useParams } from "@tanstack/react-router"
import { useLocation } from "@tanstack/react-router"
import { ChevronDown, KanbanSquare, Layers, LineChart, ListTodo, Rows3, Sparkles, Users } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar } from "@/components/app/avatar"
import { ProjectSwitcher } from "@/components/sidebar/project-switcher"
import { useAuth } from "@/lib/stores/auth"
import { useSidebarStore } from "@/lib/stores/sidebar"
import { useProjectStore } from "@/lib/stores/project"
import { useProjectBySlug } from "@/lib/queries/projects"
import { viewEnabled } from "@/lib/project-views"
import { canDeleteProject, isProjectAdmin } from "@/lib/permissions"
import { SETTINGS_SECTIONS } from "@/components/settings/settings-nav"

/** Persisted collapsible group, wired to the shadcn sidebar group pattern. */
function CollapsibleGroup({
  id,
  label,
  forceOpen,
  children,
}: {
  id: string
  label: string
  forceOpen?: boolean
  children: React.ReactNode
}) {
  const open = useSidebarStore((s) => s.isSectionOpen(id))
  const toggleSection = useSidebarStore((s) => s.toggleSection)

  return (
    <Collapsible
      open={forceOpen || open}
      onOpenChange={() => toggleSection(id)}
      className="group/collapsible"
    >
      <SidebarGroup>
        <SidebarGroupLabel render={<CollapsibleTrigger className="w-full" />}>
          <span>{label}</span>
          <ChevronDown className="ml-auto transition-transform group-data-open/collapsible:rotate-180" />
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>{children}</SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

/** The GitLab-style super sidebar, built on the shadcn sidebar primitives. */
export function AppSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams({ strict: false })
  const { setOpenMobile } = useSidebar()
  const { user } = useAuth()
  const setSelectedSlug = useProjectStore((s) => s.setSelectedSlug)

  const urlSlug = (params as { slug?: string }).slug ?? null
  const selectedSlug = useProjectStore((s) => s.selectedSlug)
  const activeSlug = urlSlug ?? selectedSlug
  const { project, isLoading: projectsLoading } = useProjectBySlug(activeSlug ?? undefined)

  function go(to: string, slug?: string) {
    if (slug) setSelectedSlug(slug)
    setOpenMobile(false)
    navigate({ to, params: slug ? { slug } : undefined })
  }

  function projectView(view: string) {
    if (!activeSlug) return
    go(`/projects/${activeSlug}/${view}`, activeSlug)
  }

  const views = [
    {
      key: "board",
      label: "Board",
      icon: <KanbanSquare />,
      enabled: viewEnabled(project, "board"),
    },
    {
      key: "backlog",
      label: "Backlog",
      icon: <Rows3 />,
      enabled: viewEnabled(project, "backlog"),
    },
    { key: "epics", label: "Epics", icon: <Layers />, enabled: viewEnabled(project, "epics") },
    {
      key: "velocity",
      label: "Velocity",
      icon: <LineChart />,
      enabled: viewEnabled(project, "velocity"),
    },
  ] as const

  // In the icon rail every group is forced open so all icons stay reachable.
  const rail = useSidebar().state === "collapsed"

  return (
    // Desktop panel is viewport-fixed; the cohort top bar owns the first 2rem,
    // so the sidebar starts below it.
    <Sidebar collapsible="icon" style={{ top: "2rem", height: "calc(100svh - 2rem)" }}>
      <SidebarHeader>
        <ProjectSwitcher slug={activeSlug ?? ""} />
      </SidebarHeader>
      <SidebarContent>
        <CollapsibleGroup id="views" label="Views" forceOpen={rail}>
          {activeSlug && projectsLoading && !project
            ? [0, 1, 2, 3].map((i) => (
                <SidebarMenuItem key={i}>
                  <SidebarMenuSkeleton showIcon />
                </SidebarMenuItem>
              ))
            : views
                .filter((v) => v.enabled)
                .map((v) => (
                  <SidebarMenuItem key={v.key}>
                    <SidebarMenuButton
                      isActive={location.pathname === `/projects/${activeSlug}/${v.key}`}
                      tooltip={v.label}
                      onClick={() => projectView(v.key)}
                    >
                      {v.icon}
                      <span>{v.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
        </CollapsibleGroup>

        <CollapsibleGroup id="general" label="General" forceOpen={rail}>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={location.pathname === "/tasks"}
              tooltip="My Tasks"
              onClick={() => go("/tasks")}
            >
              <ListTodo />
              <span>My Tasks</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
                isActive={location.pathname === `/projects/${activeSlug}/members`}
              disabled={!activeSlug}
              tooltip="Members"
              onClick={() => projectView("members")}
            >
              <Users />
              <span>Members</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </CollapsibleGroup>

        {activeSlug && (!project || isProjectAdmin(project)) && (
          <CollapsibleGroup
            id="settings"
            label="Settings"
            forceOpen={rail || location.pathname.includes(`/projects/${activeSlug}/settings`)}
          >
            {SETTINGS_SECTIONS.filter((s) => !s.requiresDelete || canDeleteProject(project)).map(
              (s) => {
                const to = `/projects/${activeSlug}/settings/${s.key}`
                const Icon = s.icon
                return (
                  <SidebarMenuItem key={s.key}>
                    <SidebarMenuButton
                      isActive={location.pathname === to}
                      tooltip={s.label}
                      onClick={() => navigate({ to: s.route, params: { slug: activeSlug } })}
                    >
                      <Icon />
                      <span>{s.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              },
            )}
          </CollapsibleGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={location.pathname.startsWith("/whats-new")}
              tooltip="What's new"
              onClick={() => go("/whats-new")}
            >
              <Sparkles />
              <span>What's new</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Your account" onClick={() => go("/account")}>
              <Avatar
                name={user?.full_name || user?.username}
                photo={user?.photo}
                size="sm"
                className="shrink-0"
              />
              <span className="truncate">{user?.full_name_display || user?.username || "Signed in"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
