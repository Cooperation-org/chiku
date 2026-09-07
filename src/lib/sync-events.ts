import type {
  MutationCacheNotifyEvent,
  QueryCacheNotifyEvent,
  QueryClient,
} from "@tanstack/react-query"

export type SyncSettleKind = "success" | "error"

export interface SyncSettleSnapshot {
  /** Monotonic id of the last settle; `kind: null` means idle. */
  seq: number
  kind: SyncSettleKind | null
  /** Human message for the tooltip (error text; null on success/idle). */
  message: string | null
}

const IDLE: SyncSettleSnapshot = { seq: 0, kind: null, message: null }

/** How long a success/error flash stays visible before decaying to idle. */
const FLASH_MS = 1600

interface ClientBinding {
  snapshot: SyncSettleSnapshot
  listeners: Set<() => void>
  detach: (() => void) | null
  timer: ReturnType<typeof setTimeout> | null
}

const bindings = new WeakMap<QueryClient, ClientBinding>()

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error) return error
  return "Unknown error"
}

function emit(binding: ClientBinding) {
  binding.listeners.forEach((listener) => listener())
}

function record(binding: ClientBinding, kind: SyncSettleKind, message: string | null) {
  const seq = binding.snapshot.seq + 1
  binding.snapshot = { seq, kind, message }
  emit(binding)
  if (binding.timer) clearTimeout(binding.timer)
  // The decay lives in the cache-event callback (outside render), so no
  // effect hook is needed — a stale timer never clears a newer settle.
  binding.timer = setTimeout(() => {
    if (binding.snapshot.seq !== seq) return
    binding.snapshot = { seq, kind: null, message: null }
    emit(binding)
  }, FLASH_MS)
}

function onQueryEvent(binding: ClientBinding, event: QueryCacheNotifyEvent) {
  if (event.type !== "updated") return
  if (event.action.type === "success") record(binding, "success", null)
  else if (event.action.type === "error") {
    record(binding, "error", errorMessage(event.action.error))
  }
}

function onMutationEvent(binding: ClientBinding, event: MutationCacheNotifyEvent) {
  if (event.type !== "updated") return
  const { status, error } = event.mutation.state
  if (status === "success") record(binding, "success", null)
  else if (status === "error") record(binding, "error", errorMessage(error))
}

function attach(client: QueryClient, binding: ClientBinding) {
  const unsubQuery = client.getQueryCache().subscribe((event) => onQueryEvent(binding, event))
  const unsubMutation = client.getMutationCache().subscribe((event) => onMutationEvent(binding, event))
  binding.detach = () => {
    unsubQuery()
    unsubMutation()
    if (binding.timer) clearTimeout(binding.timer)
    binding.timer = null
  }
}

/**
 * `subscribe` half of the `useSyncExternalStore` pair. Attaches the cache
 * subscriptions on first listener and detaches them (plus the decay timer)
 * when the last listener leaves.
 */
export function subscribeToSyncSettles(client: QueryClient, listener: () => void): () => void {
  let binding = bindings.get(client)
  if (!binding) {
    binding = { snapshot: IDLE, listeners: new Set(), detach: null, timer: null }
    bindings.set(client, binding)
  }
  if (binding.listeners.size === 0) attach(client, binding)
  binding.listeners.add(listener)
  const current = binding
  return () => {
    current.listeners.delete(listener)
    if (current.listeners.size === 0) {
      current.detach?.()
      current.detach = null
    }
  }
}

/** `getSnapshot` half — returns a referentially stable ref, replaced on change. */
export function getSyncSettleSnapshot(client: QueryClient): SyncSettleSnapshot {
  return bindings.get(client)?.snapshot ?? IDLE
}
