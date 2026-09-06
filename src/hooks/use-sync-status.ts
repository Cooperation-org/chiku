import { useSyncExternalStore } from "react"
import {
  onlineManager,
  useIsFetching,
  useIsMutating,
  useQueryClient,
} from "@tanstack/react-query"
import { getSyncSettleSnapshot, subscribeToSyncSettles } from "@/lib/sync-events"

export type SyncDisplay = "idle" | "active" | "success" | "error"

export interface SyncStatus {
  display: SyncDisplay
  pendingCount: number
  online: boolean
  /** Last settle message (error text), for the tooltip. */
  message: string | null
}

const IDLE_SNAPSHOT = { seq: 0, kind: null, message: null } as const

/**
 * App-wide sync state, composed entirely of external-store subscriptions —
 * no effects. Display priority: in-flight work beats the last settle flash,
 * which decays back to idle on its own.
 */
export function useSyncStatus(): SyncStatus {
  const client = useQueryClient()
  const fetching = useIsFetching()
  const mutating = useIsMutating()
  const settle = useSyncExternalStore(
    (notify) => subscribeToSyncSettles(client, notify),
    () => getSyncSettleSnapshot(client),
    () => IDLE_SNAPSHOT,
  )
  const online = useSyncExternalStore(
    (notify) => onlineManager.subscribe(notify),
    () => onlineManager.isOnline(),
    () => true,
  )

  const pendingCount = fetching + mutating
  return {
    display: pendingCount > 0 ? "active" : (settle.kind ?? "idle"),
    pendingCount,
    online,
    message: settle.message,
  }
}
