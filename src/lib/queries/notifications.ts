import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import {
  listWebNotifications,
  markAllWebNotificationsRead,
  markWebNotificationRead,
} from "@/lib/api/notifications"
import type { WebNotificationsResponse } from "@/lib/api/types"

/**
 * The bell feed. Polls lightly while the tab is visible so a teammate's
 * mention/comment surfaces without reloads; the global query defaults
 * (no refocus refetch) stay untouched for everything else.
 */
export function useWebNotifications() {
  return useQuery({
    queryKey: qk.notifications(),
    queryFn: listWebNotifications,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    meta: { label: "notifications feed" },
  })
}

function markReadOptimistic(
  qc: ReturnType<typeof useQueryClient>,
  key: readonly unknown[],
  ids: number[] | "all",
) {
  qc.setQueryData<WebNotificationsResponse>(key, (old) => {
    if (!old) return old
    const now = new Date().toISOString()
    return {
      ...old,
      objects: old.objects.map((n) =>
        n.read != null
          ? n
          : ids === "all" || ids.includes(n.id)
            ? { ...n, read: now }
            : n,
      ),
    }
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  const key = qk.notifications()
  return useMutation({
    mutationFn: (id: number) => markWebNotificationRead(id),
    onMutate: async (id) => {
      const previous = qc.getQueryData<WebNotificationsResponse>(key)
      markReadOptimistic(qc, key, [id])
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  const key = qk.notifications()
  return useMutation({
    mutationFn: markAllWebNotificationsRead,
    onMutate: async () => {
      const previous = qc.getQueryData<WebNotificationsResponse>(key)
      markReadOptimistic(qc, key, "all")
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}
