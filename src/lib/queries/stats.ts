import { useQuery } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import {
  getMilestoneStats,
  getProjectIssueStats,
  getUserStats,
} from "@/lib/api/stats"

export function useProjectIssueStats(projectId: number | null) {
  return useQuery({
    queryKey: qk.issueStats(projectId ?? 0),
    queryFn: () => getProjectIssueStats(projectId!),
    enabled: projectId != null,
    meta: { label: "issues stats", projectId: projectId ?? 0 },
  })
}

export function useMilestoneStats(milestoneId: number | null) {
  return useQuery({
    queryKey: qk.milestoneStats(milestoneId ?? 0),
    queryFn: () => getMilestoneStats(milestoneId!),
    enabled: milestoneId != null,
    meta: { label: "sprint stats" },
  })
}

export function useUserStats(userId: number | null) {
  return useQuery({
    queryKey: qk.userStats(userId ?? 0),
    queryFn: () => getUserStats(userId!),
    enabled: userId != null,
    meta: { label: "your stats" },
  })
}
