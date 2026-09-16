import { useQuery } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import { getMe, getUserByUsername, getUserStats, type Me, type MemberProfile } from "@/lib/api/users"
import type { UserStats } from "@/lib/api/types"

/** The signed-in user, authoritatively from the API (GET /users/me). */
export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: getMe,
    staleTime: 60_000,
    meta: { label: "Session" },
  })
}

/** Public member profile resolved by exact @mention text (GET /users/by_username). */
export function useMemberProfile(username: string | null) {
  return useQuery({
    queryKey: qk.member(username ?? ""),
    queryFn: (): Promise<MemberProfile | null> => getUserByUsername(username!),
    enabled: username != null && username.trim().length > 0,
    staleTime: 5 * 60_000,
    meta: { label: "member profile" },
  })
}

/** Roll-up stats for a member (GET /users/{id}/stats). */
export function useMemberStats(userId: number | null) {
  return useQuery({
    queryKey: qk.userStats(userId ?? 0),
    queryFn: (): Promise<UserStats> => getUserStats(userId!),
    enabled: userId != null,
    staleTime: 5 * 60_000,
    meta: { label: "member stats" },
  })
}

export type { Me, MemberProfile }
