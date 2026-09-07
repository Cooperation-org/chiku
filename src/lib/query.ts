import { QueryClient } from "@tanstack/react-query"
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import { del, get, set } from "idb-keyval"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cached data renders immediately; the network still fires and failed
      // fetches never clobber the cache — the clavis offline-first model.
      networkMode: "offlineFirst",
      // Taiga data is not hot; refetching on window focus is just noise
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
    mutations: {
      // Offline-made changes queue and replay on reconnect instead of failing.
      networkMode: "offlineFirst",
      retry: 1,
    },
  },
})

/**
 * IndexedDB persister (the officially documented combo) — the app boots
 * from the last known cache and refetches in the background
 * (stale-while-revalidate), so revisit paints carry no loading flash.
 */
export const queryPersister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => get(key),
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key),
  },
})

const PERSIST_BUSTER = "chiku-query-v1"
const PERSIST_MAX_AGE = 7 * 24 * 60 * 60 * 1000

function shouldPersistQuery(query: { queryKey: readonly unknown[] }): boolean {
  const key = query.queryKey
  // Everything persists except per-keystroke search results — those are
  // ephemeral (one cache entry per distinct text) and cheap to refetch.
  if (key[0] === "project" && key[2] === "search") return false
  return true
}

export const queryPersistOptions = {
  persister: queryPersister,
  maxAge: PERSIST_MAX_AGE,
  buster: PERSIST_BUSTER,
  dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
}

/** Canonical query keys â€” every hook must build keys from these. */
export const qk = {
  projects: ["projects"] as const,
  project: (id: number) => ["project", id] as const,
  statuses: (projectId: number) => ["project", projectId, "statuses"] as const,
  stories: (projectId: number) => ["project", projectId, "stories"] as const,
  /** One story by its human ref — used by deep links, no list needed. */
  storyRef: (projectId: number, ref: number) => ["project", projectId, "story-ref", ref] as const,
  /** Project-scoped search results for a text query. */
  search: (projectId: number, text: string) => ["project", projectId, "search", text] as const,
  epics: (projectId: number) => ["project", projectId, "epics"] as const,
  milestones: (projectId: number) => ["project", projectId, "milestones"] as const,
  /** Agile totals + per-sprint series for the project homepage. */
  stats: (projectId: number) => ["project", projectId, "stats"] as const,
  memberships: (projectId: number) => ["project", projectId, "memberships"] as const,
  comments: (storyId: number) => ["story", storyId, "comments"] as const,
  attachments: (storyId: number) => ["story", storyId, "attachments"] as const,
  myTasks: () => ["my-tasks"] as const,
  me: ["me"] as const,
  users: (projectId: number) => ["project", projectId, "users"] as const,
  projectModules: (projectId: number) => ["project", projectId, "modules"] as const,
  webhooks: (projectId: number) => ["project", projectId, "webhooks"] as const,
  webhookLogs: (webhookId: number) => ["webhook", webhookId, "logs"] as const,
  notifyPolicies: () => ["notify-policies"] as const,
  projectTemplates: () => ["project-templates"] as const,
}
