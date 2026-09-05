import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import {
  createUserStory,
  getAllUserStoriesPaged,
  getUserStories,
  getUserStory,
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
  })
}

export function useStories(projectId: number | null) {
  return useQuery({
    queryKey: qk.stories(projectId ?? 0),
    queryFn: () => getUserStories(projectId!),
    enabled: projectId != null,
  })
}

export function useStory(id: number | null) {
  return useQuery({
    queryKey: qk.story(id ?? 0),
    queryFn: () => getUserStory(id!),
    enabled: id != null,
  })
}

export function useMyTasks() {
  return useQuery({
    queryKey: qk.myTasks(),
    queryFn: async () => {
      const [storyResult, projects] = await Promise.all([getAllUserStoriesPaged(), getProjects()])
      return {
        stories: storyResult.stories,
        loadedEverything: storyResult.complete,
        projects: projects.filter((p) => !isArchived(p)),
      }
    },
  })
}

/** Optimistic column move â€” the board PATCHes status with rollback on failure. */
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

export type { UserStoryStatus }
