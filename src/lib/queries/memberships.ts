import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import {
  addMembership,
  getAllUsers,
  getProjectMemberships,
  getProjectRoles,
  removeMembership,
  searchUsers,
} from "@/lib/api/memberships"
import type { Membership, Role } from "@/lib/api/memberships"
import type { Mentionable } from "@/lib/mentions"

export function useMemberships(projectId: number | null) {
  return useQuery({
    queryKey: qk.memberships(projectId ?? 0),
    queryFn: () => getProjectMemberships(projectId!),
    enabled: projectId != null,
    meta: { label: "members list", projectId: projectId ?? 0 },
  })
}

export function useRoles(projectId: number | null) {
  return useQuery({
    queryKey: [...qk.memberships(projectId ?? 0), "roles"],
    queryFn: () => getProjectRoles(projectId!),
    enabled: projectId != null,
    meta: { label: "roles list", projectId: projectId ?? 0 },
  })
}

/**
 * Project-scoped `@` mention candidates with REAL Taiga usernames.
 *
 * Taiga's membership rows carry no username, so this joins the project
 * membership list with the user directory on user id — and keeps ONLY ids
 * present in that project's memberships. Outsiders are never suggested
 * (Taiga only notifies project members anyway).
 */
export function useMentionable(projectId: number | null) {
  return useQuery({
    queryKey: qk.users(projectId ?? 0),
    queryFn: async (): Promise<Mentionable[]> => {
      const [memberships, users] = await Promise.all([
        getProjectMemberships(projectId!),
        getAllUsers(),
      ])
      const userById = new Map(users.map((u) => [u.id, u]))
      const seen = new Set<string>()
      const out: Mentionable[] = []
      for (const m of memberships) {
        if (m.user == null) continue
        const u = userById.get(m.user)
        const username = (u?.username || "").trim()
        if (!username) continue
        const key = username.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ username, full_name: u?.full_name || m.full_name || username, userId: m.user })
      }
      return out.sort((a, b) =>
        a.username.toLowerCase().localeCompare(b.username.toLowerCase()),
      )
    },
    enabled: projectId != null,
    meta: { label: "mention candidates", projectId: projectId ?? 0 },
    staleTime: 5 * 60_000,
  })
}

export function useAddMembership(projectId: number) {
  const qc = useQueryClient()
  const key = qk.memberships(projectId)
  return useMutation({
    mutationFn: ({ username, roleId }: { username: string; roleId: number }) =>
      addMembership(projectId, username, roleId),
    onSuccess: (created: Membership) => {
      qc.setQueryData<Membership[]>(key, (old) => [...(old ?? []), created])
    },
  })
}

export function useRemoveMembership(projectId: number) {
  const qc = useQueryClient()
  const key = qk.memberships(projectId)
  return useMutation({
    mutationFn: (membershipId: number) => removeMembership(membershipId),
    onSuccess: (_data, membershipId) => {
      qc.setQueryData<Membership[]>(key, (old) => old?.filter((m) => m.id !== membershipId))
    },
  })
}

export { searchUsers }
export type { Membership, Role }
