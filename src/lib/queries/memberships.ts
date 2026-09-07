import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import {
  addMembership,
  getProjectMemberships,
  getProjectRoles,
  removeMembership,
  searchUsers,
} from "@/lib/api/memberships"
import type { Membership, Role } from "@/lib/api/memberships"

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
