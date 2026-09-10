import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import { searchProject } from "@/lib/api/search"
import {
  bulkUpdateKanbanOrder,
  createUserStory,
  getAllUserStoriesPaged,
  getUserStories,
  getUserStory,
  getUserStoryByRef,
  getUserStoryStatuses,
  moveUserStory,
  setUserStoryStatus,
  updateUserStory,
} from "@/lib/api/userstories"
import { api } from "@/lib/api/client"
import { getProjects, isArchived } from "@/lib/api/projects"
import type { UserStory, UserStoryStatus } from "@/lib/api/types"

export function useStatuses(projectId: number | null) {
  return useQuery({
    queryKey: qk.statuses(projectId ?? 0),
    queryFn: () => getUserStoryStatuses(projectId!),
    enabled: projectId != null,
    meta: { label: "statuses list", projectId: projectId ?? 0 },
  })
}

export function useStories(projectId: number | null) {
  return useQuery({
    queryKey: qk.stories(projectId ?? 0),
    queryFn: () => getUserStories(projectId!),
    enabled: projectId != null,
    meta: { label: "stories list", projectId: projectId ?? 0 },
  })
}

export function useStory(id: number | null) {
  return useQuery({
    queryKey: ["story", id ?? 0] as const,
    queryFn: () => getUserStory(id!),
    enabled: id != null,
    meta: { label: `story #${id ?? 0}` },
  })
}

/** One story by its human ref — deep links resolve without a full list. */
export function useStoryByRef(projectId: number | null, ref: number | null) {
  return useQuery({
    queryKey: qk.storyRef(projectId ?? 0, ref ?? 0),
    queryFn: () => getUserStoryByRef(projectId!, ref!),
    enabled: projectId != null && ref != null,
    meta: { label: `story #${ref ?? 0}`, projectId: projectId ?? 0 },
  })
}

/** Project-scoped server search for the palette. Caller gates on text length. */
export function useSearch(projectId: number | null, text: string) {
  const trimmed = text.trim()
  return useQuery({
    queryKey: qk.search(projectId ?? 0, trimmed),
    queryFn: () => searchProject(projectId!, trimmed),
    enabled: projectId != null && trimmed.length >= 2,
    meta: { label: "search", projectId: projectId ?? 0 },
  })
}

export function useMyTasks(includeClosed: boolean) {
  return useQuery({
    queryKey: [...qk.myTasks(), includeClosed] as const,
    queryFn: async () => {
      const [storyResult, projects] = await Promise.all([
        getAllUserStoriesPaged(includeClosed ? {} : { status__is_closed: false }),
        getProjects(),
      ])
      return {
        stories: storyResult.stories,
        loadedEverything: storyResult.complete,
        projects: projects.filter((p) => !isArchived(p)),
      }
    },
    meta: { label: includeClosed ? "My tasks · all" : "My tasks" },
  })
}

/** Optimistic column move — the board PATCHes status with rollback on failure. */
export function useSetStoryStatus(projectId: number) {
  const qc = useQueryClient()
  const key = qk.stories(projectId)
  return useMutation({
    mutationFn: ({ storyId, statusId, version }: { storyId: number; statusId: number; version: number }) =>
      setUserStoryStatus(storyId, statusId, version),
    onMutate: async ({ storyId, statusId }) => {
      const previous = qc.getQueryData<UserStory[]>(key)
      qc.setQueryData<UserStory[]>(key, (old) =>
        old?.map((s) => (s.id === storyId ? { ...s, status: statusId } : s))
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
    onSuccess: (updated) => {
      qc.setQueryData<UserStory[]>(key, (old) =>
        old?.map((s) => (s.id === updated.id ? { ...s, version: updated.version } : s))
      )
    },
  })
}

export function useUpdateStory(projectId: number) {
  const qc = useQueryClient()
  const key = qk.stories(projectId)
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> & { version?: number } }) =>
      updateUserStory(id, data as Partial<UserStory>),
    onMutate: async ({ id, data }) => {
      const previous = qc.getQueryData<UserStory[]>(key)
      qc.setQueryData<UserStory[]>(key, (old) =>
        old?.map((s) => (s.id === id ? { ...s, ...(data as Partial<UserStory>) } : s))
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
    onSuccess: (updated) => {
      qc.setQueryData<UserStory[]>(key, (old) => old?.map((s) => (s.id === updated.id ? updated : s)))
    },
  })
}

export function useCreateStory(projectId: number) {
  const qc = useQueryClient()
  const key = qk.stories(projectId)
  return useMutation({
    mutationFn: (data: {
      project: number
      subject: string
      status?: number
      description?: string
      assigned_to?: number | null
    }) => createUserStory(data),
    onSuccess: (created) => {
      qc.setQueryData<UserStory[]>(key, (old) => [...(old ?? []), created])
    },
  })
}

export function useDeleteStory(projectId: number) {
  const qc = useQueryClient()
  const key = qk.stories(projectId)
  return useMutation({
    mutationFn: (storyId: number) => api.delete(`/userstories/${storyId}`),
    onMutate: async (storyId) => {
      const previous = qc.getQueryData<UserStory[]>(key)
      qc.setQueryData<UserStory[]>(key, (old) => old?.filter((s) => s.id !== storyId))
      return { previous }
    },
    onError: (_err, _storyId, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
  })
}

export function useMoveStory(projectId: number) {
  const qc = useQueryClient()
  const key = qk.stories(projectId)
  return useMutation({
    mutationFn: ({ storyId, targetProjectId, targetStatus, version }: {
      storyId: number
      targetProjectId: number
      targetStatus: number
      version: number
    }) => moveUserStory(storyId, targetProjectId, targetStatus, version),
    onSuccess: (moved) => {
      qc.setQueryData<UserStory[]>(key, (old) => old?.filter((s) => s.id !== moved.id))
    },
  })
}

export function useDuplicateStory(projectId: number) {
  const qc = useQueryClient()
  const key = qk.stories(projectId)
  return useMutation({
    mutationFn: async (story: UserStory) => {
      const copy = await createUserStory({
        project: story.project,
        subject: story.subject + " (copy)",
        status: story.status,
        description: story.description || "",
      })
      if (story.tags && story.tags.length > 0) {
        return updateUserStory(copy.id, { tags: story.tags, version: copy.version })
      }
      return copy
    },
    onSuccess: (copy) => {
      qc.setQueryData<UserStory[]>(key, (old) => [...(old ?? []), copy])
    },
  })
}

/**
 * Persist a reordered kanban column in one call. The caller passes the new
 * card-id order; this writes it through the bulk endpoint and reverts the
 * stories cache on failure.
 */
export function useReorderKanbanOrder(projectId: number) {
  const qc = useQueryClient()
  const key = qk.stories(projectId)
  return useMutation({
    mutationFn: ({ storyIds, statusId }: { storyIds: number[]; statusId: number }) =>
      bulkUpdateKanbanOrder(projectId, statusId, storyIds),
    onMutate: async ({ storyIds }) => {
      const previous = qc.getQueryData<UserStory[]>(key)
      const orderOf = new Map(storyIds.map((id, i) => [id, (i + 1) * 10] as const))
      qc.setQueryData<UserStory[]>(key, (old) =>
        old?.map((s) => {
          const order = orderOf.get(s.id)
          return order !== undefined ? { ...s, kanban_order: order } : s
        })
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}

export type { UserStoryStatus }
