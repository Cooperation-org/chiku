import { useQuery } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import { getMilestones } from "@/lib/api/milestones"
import { getUserStories } from "@/lib/api/userstories"
import type { Milestone, UserStory } from "@/lib/api/types"

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
