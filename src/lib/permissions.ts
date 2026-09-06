import type { Project } from "@/lib/api/types"

/** Single permission check against the project's own flags + permission list. */
export function hasPermission(project: Project | null | undefined, perm: string): boolean {
  if (!project) return false
  if (project.i_am_owner === true || project.i_am_admin === true) return true
  return project.my_permissions?.includes(perm) ?? false
}

/** Full settings access — the settings route and sidebar item gate on this. */
export function isProjectAdmin(project: Project | null | undefined): boolean {
  if (!project) return false
  return (
    project.i_am_owner === true ||
    project.i_am_admin === true ||
    hasPermission(project, "modify_project")
  )
}

export function canModifyProject(project: Project | null | undefined): boolean {
  return hasPermission(project, "modify_project")
}

export function canDeleteProject(project: Project | null | undefined): boolean {
  return hasPermission(project, "delete_project")
}

export function canAdminValues(project: Project | null | undefined): boolean {
  return hasPermission(project, "admin_project_values")
}

export function canAdminRoles(project: Project | null | undefined): boolean {
  return hasPermission(project, "admin_roles")
}

export function canManageMembers(project: Project | null | undefined): boolean {
  return hasPermission(project, "add_member") || hasPermission(project, "remove_member")
}
