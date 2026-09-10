import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import {
  archiveProject,
  createProject,
  deleteProject,
  getProjects,
  getProjectStats,
  isArchived,
  reorderProjects,
  unarchiveProject,
  updateProject,
  type CreateProjectData,
} from "@/lib/api/projects"
import type { Project } from "@/lib/api/types"

export function useProjects() {
  return useQuery({ queryKey: qk.projects, queryFn: getProjects, meta: { label: "Projects" } })
}

export function useActiveProjects() {
  const query = useProjects()
  return { ...query, data: query.data?.filter((p) => !isArchived(p)) }
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProjectData) => createProject(data),
    onSuccess: (created: Project) => {
      qc.setQueryData<Project[]>(qk.projects, (old) => [created, ...(old ?? [])])
    },
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Project> }) => updateProject(id, data),
    onSuccess: (updated) => {
      qc.setQueryData<Project[]>(qk.projects, (old) =>
        old?.map((p) => (p.id === updated.id ? updated : p))
      )
      // project detail caches are keyed by id — refresh statuses/stories etc. lazily
      qc.invalidateQueries({ queryKey: qk.project(updated.id) })
    },
  })
}

export function useArchiveProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (project: Project) => archiveProject(project),
    onSuccess: (updated) => {
      qc.setQueryData<Project[]>(qk.projects, (old) =>
        old?.map((p) => (p.id === updated.id ? updated : p))
      )
    },
  })
}

export function useUnarchiveProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (project: Project) => unarchiveProject(project),
    onSuccess: (updated) => {
      qc.setQueryData<Project[]>(qk.projects, (old) =>
        old?.map((p) => (p.id === updated.id ? updated : p))
      )
    },
  })
}

export function useReorderProjects() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (order: { project_id: number; order: number }[]) => reorderProjects(order),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.projects }),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (projectId: number) => deleteProject(projectId),
    onSuccess: (_data, projectId) => {
      qc.setQueryData<Project[]>(qk.projects, (old) => old?.filter((p) => p.id !== projectId))
      qc.removeQueries({ queryKey: qk.project(projectId) })
    },
  })
}


/** Shareable query options — the home loader warm-starts the list with this. */
export const projectsQueryOptions = {
  queryKey: qk.projects,
  queryFn: getProjects,
}

/** Resolve a URL slug against the project list. Derived state only — the
 *  URL is the source of truth; nothing is synced anywhere. */
export function useProjectBySlug(slug: string | undefined) {
  const { data: projects, isLoading } = useProjects()
  const project = useMemo(
    () => (slug ? projects?.find((p) => p.slug === slug) ?? null : null),
    [projects, slug]
  )
  return { project, isLoading }
}

export function useProjectStats(projectId: number | null) {
  return useQuery({
    queryKey: qk.stats(projectId ?? 0),
    queryFn: () => getProjectStats(projectId!),
    enabled: projectId != null,
    meta: { label: "stats", projectId: projectId ?? 0 },
  })
}