/**
 * Toolbar breadcrumbs, declared per route via `staticData.toolbarBreadcrumbs`
 * and concatenated down the match chain by AppToolbar (section → page). The
 * project itself is already shown in the switcher, so crumbs start at the
 * section. The toolbar owns the look — plain muted spans that inherit from
 * the wrapper — keeping the original single-crumb tuning.
 */

function crumb(label: string) {
  function Crumb() {
    return <span className="min-w-0 truncate">{label}</span>
  }
  Crumb.displayName = label
  return Crumb
}

export const CrumbMyTasks = crumb("My Tasks")
export const CrumbAccount = crumb("Account")
export const CrumbOverview = crumb("Overview")
export const CrumbBoard = crumb("Board")
export const CrumbBacklog = crumb("Backlog")
export const CrumbSprints = crumb("Sprints")
export const CrumbEpics = crumb("Epics")
export const CrumbVelocity = crumb("Velocity")
export const CrumbMembers = crumb("Members")
export const CrumbMember = crumb("Member")
export const CrumbStats = crumb("Stats")
export const CrumbSettings = crumb("Settings")
export const CrumbGeneral = crumb("General")
export const CrumbNotifications = crumb("Notifications")
export const CrumbIntegrations = crumb("Integrations")
export const CrumbWebhooks = crumb("Webhooks")
export const CrumbData = crumb("Data")
export const CrumbOwnership = crumb("Ownership")
export const CrumbDanger = crumb("Danger")
