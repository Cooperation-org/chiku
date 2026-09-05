import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Taiga data is not hot; refetching on window focus is just noise
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
})

/** Canonical query keys â€” every hook must build keys from these. */
export const qk = {
  projects: ["projects"] as const,
  project: (id: number) => ["project", id] as const,
  statuses: (projectId: number) => ["project", projectId, "statuses"] as const,
  stories: (projectId: number) => ["project", projectId, "stories"] as const,
  story: (ref: number) => ["story", ref] as const,
  epics: (projectId: number) => ["project", projectId, "epics"] as const,
  milestones: (projectId: number) => ["project", projectId, "milestones"] as const,
  memberships: (projectId: number) => ["project", projectId, "memberships"] as const,
  comments: (storyId: number) => ["story", storyId, "comments"] as const,
  attachments: (storyId: number) => ["story", storyId, "attachments"] as const,
  myTasks: () => ["my-tasks"] as const,
  me: ["me"] as const,
  users: (projectId: number) => ["project", projectId, "users"] as const,
}
