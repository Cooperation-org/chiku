import { SETTINGS_SECTIONS } from "@/components/settings/settings-nav"
import {
  SettingsContext,
  useSettings,
} from "@/components/settings/use-settings"
import { Button } from "@/components/ui/button"
import {
  canDeleteProject,
  canModifyProject,
  isProjectAdmin,
} from "@/lib/permissions"
import { useProjectBySlug } from "@/lib/queries/projects"
import { Link, Outlet, useLocation } from "@tanstack/react-router"
import { PageLoading } from "@/components/layout/page-state"
import { PageTransition } from "@/components/layout/page-transition"

function sectionVisible(key: string, canDelete: boolean) {
  const meta = SETTINGS_SECTIONS.find((s) => s.key === key)
  if (!meta) return false
  if (meta.requiresDelete && !canDelete) return false
  return true
}

/** Guard for leaf routes that require delete rights (danger zone). */
export function SettingsGuard({
  section,
  children,
}: {
  section: string
  children: React.ReactNode
}) {
  const { canDelete } = useSettings()
  if (!sectionVisible(section, canDelete)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground">
          You don't have access to this section
        </div>
      </div>
    )
  }
  return <>{children}</>
}

export function SettingsLayout({ slug }: { slug: string }) {
  const { project, isLoading } = useProjectBySlug(slug)
  // Keying the child outlet by pathname remounts it on every settings→settings
  // navigation, replaying the enter transition (no exit orchestration needed).
  const pathname = useLocation().pathname

  if (isLoading || !project) {
    return (
      <div className="h-full">
        {isLoading ? (
          <PageLoading label="Loading settings" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-sm text-muted-foreground">
              Select a project to view its settings
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!isProjectAdmin(project)) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">{project.name}</p>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="max-w-sm space-y-3 text-center">
            <p className="text-sm font-medium">Project admins only</p>
            <p className="text-sm text-muted-foreground">
              Ask a project admin to change settings or manage your access.
            </p>
            <Button
              variant="outline"
              size="sm"
              render={<Link to="/projects/$slug/members" params={{ slug }} />}
            >
              View members
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const canEdit = canModifyProject(project)
  const canDelete = canDeleteProject(project)

  return (
    <SettingsContext.Provider value={{ project, canEdit, canDelete }}>
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl">
            <PageTransition transitionKey={pathname}>
              <Outlet />
            </PageTransition>
          </div>
        </div>
      </div>
    </SettingsContext.Provider>
  )
}
