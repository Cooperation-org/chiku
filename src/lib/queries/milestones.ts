import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import { closeMilestone, createMilestone, deleteMilestone, getMilestones, reopenMilestone, updateMilestone } from "@/lib/api/milestones"
import { getUserStories, moveUserStoryToSprint } from "@/lib/api/userstories"
import type { Milestone, UserStory } from "@/lib/api/types"

export function useMilestones(projectId: number | null) {
  return useQuery({
    queryKey: qk.milestones(projectId ?? 0),
    queryFn: () => getMilestones(projectId!),
    enabled: projectId != null,
    meta: { label: "sprints list", projectId: projectId ?? 0 },
  })
}

export function useVelocityData(projectId: number | null) {
  return useQuery({
    queryKey: [...qk.milestones(projectId ?? 0), "velocity"],
    queryFn: async () => {
      const [milestones, stories] = await Promise.all([
        getMilestones(projectId!),
        getUserStories(projectId!),
      ])
      const sorted = milestones.sort(
        (a, b) => new Date(a.estimated_start).getTime() - new Date(b.estimated_start).getTime()
      )
      // Remaining backlog points: stories in no sprint and not closed.
      const backlogPoints = stories
        .filter((s: UserStory) => !s.milestone && !s.is_closed)
        .reduce((sum, s) => sum + (s.total_points || 0), 0)
      return { milestones: sorted, backlogPoints }
    },
    enabled: projectId != null,
    meta: { label: "velocity", projectId: projectId ?? 0 },
  })
}

export type { Milestone }

/** Create a sprint; refreshes the sprints list on success. */
export function useCreateMilestone(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; estimated_start: string; estimated_finish: string }) =>
      createMilestone({ project: projectId, ...data }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.milestones(projectId) })
    },
  })
}

/** Rename / reschedule / close / reopen a sprint. */
export function useUpdateMilestone(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Milestone> }) =>
      updateMilestone(id, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.milestones(projectId) })
    },
  })
}

/**
 * Move one story into (or out of — null) a sprint, with optimistic cache
 * update and rollback. Version conflicts retry once inside the API layer.
 */
export function useMoveStoryToSprint(projectId: number) {
  const qc = useQueryClient()
  const key = qk.stories(projectId)
  return useMutation({
    mutationFn: ({ storyId, milestoneId, version }: { storyId: number; milestoneId: number | null; version: number }) =>
      moveUserStoryToSprint(storyId, milestoneId, version),
    onMutate: async ({ storyId, milestoneId }) => {
      const previous = qc.getQueryData<UserStory[]>(key)
      qc.setQueryData<UserStory[]>(key, (old) =>
        old?.map((s) => (s.id === storyId ? { ...s, milestone: milestoneId } : s)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key })
      qc.invalidateQueries({ queryKey: qk.milestones(projectId) })
    },
  })
}

/**
 * Close a sprint, rolling unfinished stories to the destination first.
 * `destinationId` null sends them back to the backlog. Sequential moves keep
 * Taiga's version checks happy; a failure aborts before the close so no work
 * is stranded in a closed sprint.
 */
export function useCloseSprintAndRollover(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      sprintId,
      unfinished,
      destinationId,
    }: {
      sprintId: number
      unfinished: UserStory[]
      destinationId: number | null
    }) => {
      for (const s of unfinished) {
        await moveUserStoryToSprint(s.id, destinationId, s.version)
      }
      return closeMilestone(sprintId)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.stories(projectId) })
      qc.invalidateQueries({ queryKey: qk.milestones(projectId) })
    },
  })
}

export function useReopenMilestone(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => reopenMilestone(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.milestones(projectId) })
    },
  })
}

/**
 * Delete a sprint, moving every story it holds to the destination first
 * (null = backlog). Sequential moves keep Taiga's version checks happy; a
 * failure aborts before the delete so no work is stranded or orphaned.
 */
export function useDeleteMilestone(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      sprintId,
      stories,
      destinationId,
    }: {
      sprintId: number
      stories: UserStory[]
      destinationId: number | null
    }) => {
      for (const s of stories) {
        await moveUserStoryToSprint(s.id, destinationId, s.version)
      }
      return deleteMilestone(sprintId)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.stories(projectId) })
      qc.invalidateQueries({ queryKey: qk.milestones(projectId) })
    },
  })
}
