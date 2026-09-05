import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import { createEpic, getEpics, updateEpic } from "@/lib/api/epics"
import { api } from "@/lib/api/client"
import type { Epic } from "@/lib/api/types"

export function useEpics(projectId: number | null) {
  return useQuery({
    queryKey: qk.epics(projectId ?? 0),
    queryFn: () => getEpics(projectId!),
    enabled: projectId != null,
  })
}

export function useCreateEpic(projectId: number) {
  const qc = useQueryClient()
  const key = qk.epics(projectId)
  return useMutation({
    mutationFn: (data: { project: number; subject: string; color?: string; description?: string }) =>
      createEpic(data),
    onSuccess: (created) => {
      qc.setQueryData<Epic[]>(key, (old) => [...(old ?? []), created])
    },
  })
}

export function useUpdateEpic(projectId: number) {
  const qc = useQueryClient()
  const key = qk.epics(projectId)
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Epic> }) => updateEpic(id, data),
    onSuccess: (updated) => {
      qc.setQueryData<Epic[]>(key, (old) => old?.map((e) => (e.id === updated.id ? updated : e)))
    },
  })
}

export function useDeleteEpic(projectId: number) {
  const qc = useQueryClient()
  const key = qk.epics(projectId)
  return useMutation({
    mutationFn: (id: number) => api.delete(`/epics/${id}`),
    onSuccess: (_data, id) => {
      qc.setQueryData<Epic[]>(key, (old) => old?.filter((e) => e.id !== id))
    },
  })
}
