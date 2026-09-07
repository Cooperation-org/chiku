import { useEffect, useReducer, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Check, Cloud, CloudOff, Loader2, RefreshCw, TriangleAlert, WifiOff } from "lucide-react"
import { useIsMutating, useQueryClient, type Query } from "@tanstack/react-query"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { useSyncStatus } from "@/hooks/use-sync-status"
import { qk } from "@/lib/query"
import type { Project } from "@/lib/api/types"
import { cn } from "cn"

type SyncGlyph = "idle" | "syncing" | "queued" | "success" | "error"

const GLYPH_CLASS: Record<SyncGlyph, string> = {
  idle: "text-muted-foreground",
  syncing: "text-blue-500",
  queued: "text-amber-500",
  success: "text-emerald-500",
  error: "text-destructive",
}

/** Mirrors the default in lib/query.ts for queries without an override. */
const DEFAULT_STALE_TIME = 30_000

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || "Request failed"
  return error ? String(error) : "Request failed"
}

function relativeAgo(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

/** Human label for a canonical query key (see `qk` in lib/query.ts). */
function describeQueryKey(key: readonly unknown[]): string {
  const [head, ...rest] = key
  if (head === "projects") return "Projects"
  if (head === "my-tasks") return "My tasks"
  if (head === "me") return "Session"
  if (head === "notify-policies") return "Notify policies"
  if (head === "project-templates") return "Project templates"
  if (head === "project") {
    const [id, scope, extra] = rest
    const base = `Project ${String(id)}`
    if (scope === undefined) return base
    if (scope === "story-ref") return `${base} · story #${String(extra)}`
    if (scope === "search") return `${base} · search “${truncate(String(extra ?? ""), 24)}”`
    return `${base} · ${String(scope)}`
  }
  if (head === "story") {
    const [id, scope] = rest
    return scope === undefined ? `Story ${String(id)}` : `Story ${String(id)} · ${String(scope)}`
  }
  if (head === "webhook") {
    const [id, scope] = rest
    return scope === undefined ? `Webhook ${String(id)}` : `Webhook ${String(id)} · ${String(scope)}`
  }
  return key.map((segment) => String(segment)).join(" · ")
}

function queryLabel(query: Query, slugById: Map<number, string>): string {
  const meta = query.meta as { label?: string; projectId?: number } | undefined
  if (meta?.label == null) return describeQueryKey(query.queryKey)
  // Project-scoped queries render as "<slug>/<scope>" — e.g. "lynxmonde/stories list".
  if (meta.projectId != null) {
    const slug = slugById.get(meta.projectId) ?? `project-${meta.projectId}`
    return `${slug}/${meta.label}`
  }
  return meta.label
}

function rowRank(query: Query): number {
  if (query.state.fetchStatus === "fetching") return 2
  if (query.state.fetchStatus === "paused") return 1
  return 0
}

/**
 * Sync indicator + active-query inspector. The glyph crossfades with a
 * rotate/scale/blur morph; while any query or mutation is in flight the glyph
 * holds steady and only the orbit ring spins, stopping dead the moment
 * everything settles. Clicking opens the list of queries currently observed by
 * the UI (TanStack `type: "active"`): fresh ones count down to stale, stale
 * ones note they refetch when viewed, failures show their error, paused ones
 * show they are waiting for the connection — each with a refresh button, plus
 * a refresh-all action.
 */
export function SyncStatus() {
  const client = useQueryClient()
  const mutating = useIsMutating()
  const { display, pendingCount, online, message } = useSyncStatus()
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  // Re-render on any cache event so the inspector list, counts and row
  // states track queries mounting, settling and going stale.
  const [, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => client.getQueryCache().subscribe(() => bump()), [client])

  // Countdowns and ago-times only tick while the popover is open.
  useEffect(() => {
    if (!open) return
    const tick = () => setNow(Date.now())
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [open])

  const activeQueries = client.getQueryCache().findAll({ type: "active" })
  const rows = [...activeQueries].sort((a, b) => rowRank(b) - rowRank(a))
  const errored = rows.filter((q) => q.state.error != null)
  const slugById = new Map(
    (client.getQueryData<Project[]>(qk.projects) ?? []).map((p) => [p.id, p.slug] as const),
  )

  const glyph: SyncGlyph =
    display === "active" ? (online ? "syncing" : "queued") : display

  const label =
    glyph === "syncing"
      ? `Syncing… ${pendingCount} in flight`
      : glyph === "queued"
        ? `Waiting for connection… ${pendingCount} queued`
        : glyph === "success"
          ? "All changes synced"
          : glyph === "error"
            ? message
              ? `Sync failed: ${message}`
              : "Sync failed"
            : "All caught up"

  const refreshOne = (query: Query) => {
    void client.refetchQueries({ queryKey: query.queryKey, exact: true })
  }
  const refreshAll = () => {
    void client.refetchQueries()
  }
  const retryErrored = () => {
    for (const query of errored) refreshOne(query)
  }

  return (
    <Popover onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`Sync status: ${label}`}
            title={label}
            className="relative flex size-9 items-center justify-center rounded-md hover:bg-muted"
          />
        }
      >
        {/* Orbit ring — only while syncing, fades out on settle. */}
        <AnimatePresence initial={false}>
          {glyph === "syncing" && (
            <motion.span
              key="orbit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-1 text-blue-500"
              aria-hidden
            >
              <motion.svg
                viewBox="0 0 36 36"
                className="size-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              >
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="7 9"
                  strokeLinecap="round"
                />
              </motion.svg>
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={glyph}
            initial={{ opacity: 0, scale: 0.4, rotate: -60, filter: "blur(4px)" }}
            animate={
              glyph === "queued"
                ? { opacity: [1, 0.5, 1], scale: 1, rotate: 0, filter: "blur(0px)" }
                : glyph === "error"
                  ? { opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)", x: [0, -4, 4, -3, 2, 0] }
                  : { opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" }
            }
            exit={{ opacity: 0, scale: 0.4, rotate: 60, filter: "blur(4px)" }}
            transition={
              glyph === "queued"
                ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
                : { type: "spring", stiffness: 550, damping: 26 }
            }
            className={cn("flex", GLYPH_CLASS[glyph])}
          >
            {glyph === "success" ? (
              <Check className="h-4 w-4" />
            ) : glyph === "error" ? (
              <TriangleAlert className="h-4 w-4" />
            ) : glyph === "queued" ? (
              <CloudOff className="h-4 w-4" />
            ) : (
              <Cloud className="h-4 w-4" />
            )}
          </motion.span>
        </AnimatePresence>

        {/* In-flight count badge. */}
        {pendingCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
            {pendingCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent side="bottom" align="end" className="w-96 p-0">
        {!online && (
          <p className="text-amber-600 dark:text-amber-400 flex items-center gap-2 border-b bg-amber-500/10 px-3 py-2 text-xs">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            Offline — changes queue and replay on reconnect.
          </p>
        )}

        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <p className="text-sm font-medium">
            Active queries{" "}
            <span className="text-muted-foreground font-normal">({rows.length})</span>
          </p>
          <div className="flex items-center gap-1">
            {errored.length > 0 && (
              <Button
                variant="ghost"
                size="xs"
                onClick={retryErrored}
                className="text-destructive hover:text-destructive"
                aria-label="Retry failed queries"
              >
                <TriangleAlert data-icon="inline-start" />
                Retry {errored.length} failed
              </Button>
            )}
            <Button
              variant="ghost"
              size="xs"
              onClick={refreshAll}
              disabled={rows.length === 0}
              aria-label="Refresh all queries"
            >
              <RefreshCw data-icon="inline-start" />
              Refresh all
            </Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm">
            No observed queries — nothing on screen is listening to the cache.
          </p>
        ) : (
          <ul className="max-h-72 overflow-y-auto p-1">
            {rows.map((query) => {
              const fetchStatus = query.state.fetchStatus
              const error = query.state.error
              const fetching = fetchStatus === "fetching"
              const paused = fetchStatus === "paused"
              const updatedAt = query.state.dataUpdatedAt
              const name = queryLabel(query, slugById)

              let status: string
              if (error != null) status = truncate(errorMessage(error), 32)
              else if (paused) status = "waiting for connection"
              else if (fetching) status = "syncing…"
              else if (query.isStale()) status = "refreshes when viewed"
              else {
                // QueryOptions types omit staleTime (it lives on observer
                // options), but the defaulted options carry it at runtime.
                const staleTime = (query.options as { staleTime?: number }).staleTime ?? DEFAULT_STALE_TIME
                const staleInMs = updatedAt + staleTime - now
                status =
                  staleInMs > 0
                    ? `stale in ~${staleInMs > 60_000 ? `${Math.ceil(staleInMs / 60_000)}m` : `${Math.ceil(staleInMs / 1000)}s`}`
                    : "refreshes when viewed"
              }

              return (
                <li
                  key={query.queryHash}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60"
                >
                  {fetching ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-500" />
                  ) : paused ? (
                    <span
                      title="Paused"
                      className="bg-muted-foreground/60 h-2 w-2 shrink-0 animate-pulse rounded-full"
                    />
                  ) : (
                    <span
                      title={error != null ? "Failed" : query.isStale() ? "Stale" : "Fresh"}
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        error != null ? "bg-destructive" : query.isStale() ? "bg-amber-500" : "bg-emerald-500",
                      )}
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm" title={query.queryHash}>
                    {name}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-xs",
                      error != null ? "text-destructive" : "text-muted-foreground",
                    )}
                    title={
                      error != null
                        ? `${errorMessage(error)} · failed ${query.state.fetchFailureCount}×`
                        : updatedAt
                          ? new Date(updatedAt).toLocaleString()
                          : "never fetched"
                    }
                  >
                    {error == null && updatedAt ? relativeAgo(updatedAt, now) : status}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => refreshOne(query)}
                    disabled={fetching}
                    aria-label={`Refresh ${name}`}
                    title={`Refresh ${name}`}
                  >
                    <RefreshCw className={cn(fetching && "animate-spin")} />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}

        {mutating > 0 && (
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            {mutating} mutation{mutating === 1 ? "" : "s"} in flight…
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
