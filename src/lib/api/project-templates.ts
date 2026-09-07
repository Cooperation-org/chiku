import { api } from "./client"
import type { ProjectTemplate } from "./types"

export async function listProjectTemplates(): Promise<ProjectTemplate[]> {
  return api.get<ProjectTemplate[]>("/project-templates")
}
