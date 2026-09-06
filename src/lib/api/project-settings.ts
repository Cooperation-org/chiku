import { api } from "./client"
import type { Project, ProjectModules } from "./types"

export async function getProjectModules(projectId: number): Promise<ProjectModules> {
  return api.get<ProjectModules>(`/projects/${projectId}/modules`)
}

export async function updateProjectModules(
  projectId: number,
  data: Partial<ProjectModules>,
): Promise<void> {
  await api.patch<void>(`/projects/${projectId}/modules`, data)
}

export async function changeLogo(projectId: number, file: File): Promise<Project> {
  const form = new FormData()
  form.append("logo", file)
  return api.postForm<Project>(`/projects/${projectId}/change_logo`, form)
}

export async function removeLogo(projectId: number): Promise<Project> {
  return api.post<Project>(`/projects/${projectId}/remove_logo`)
}

export async function leaveProject(projectId: number): Promise<void> {
  await api.post<void>(`/projects/${projectId}/leave`)
}

export interface DuplicateProjectData {
  name: string
  description: string
  is_private: boolean
}

export async function duplicateProject(
  projectId: number,
  data: DuplicateProjectData,
): Promise<Project> {
  return api.post<Project>(`/projects/${projectId}/duplicate`, data)
}

export async function createTemplateFromProject(
  projectId: number,
  data: { template_name: string; template_description: string },
): Promise<{ id: number }> {
  return api.post<{ id: number }>(`/projects/${projectId}/create_template`, data)
}

/** Sync export returns a download URL; async returns an export_id to poll. */
export async function getExportDump(projectId: number): Promise<{ url: string } | { export_id: string }> {
  return api.get<{ url: string } | { export_id: string }>(`/exporter/${projectId}`)
}

export async function transferValidateToken(projectId: number, token: string): Promise<void> {
  await api.post<void>(`/projects/${projectId}/transfer_validate_token`, { token })
}

export async function transferRequest(projectId: number): Promise<void> {
  await api.post<void>(`/projects/${projectId}/transfer_request`)
}

export async function transferStart(projectId: number, userId: number): Promise<void> {
  await api.post<void>(`/projects/${projectId}/transfer_start`, { user: userId })
}

export async function transferAccept(
  projectId: number,
  data: { token: string; reason: string },
): Promise<void> {
  await api.post<void>(`/projects/${projectId}/transfer_accept`, data)
}

export async function transferReject(
  projectId: number,
  data: { token: string; reason: string },
): Promise<void> {
  await api.post<void>(`/projects/${projectId}/transfer_reject`, data)
}
