import type { Project } from "@/lib/api/types"

export type ProjectView = "board" | "backlog" | "sprints" | "epics" | "velocity"

export const PROJECT_VIEWS: { key: ProjectView; label: string }[] = [
  { key: "board", label: "Board" },
  { key: "backlog", label: "Backlog" },
  { key: "sprints", label: "Sprints" },
  { key: "epics", label: "Epics" },
  { key: "velocity", label: "Velocity" },
]

/**
 * Whether a project has a view's module switched on. Null (no project
 * resolved yet) means disabled — callers show skeletons while loading and
 * only enabled views once the project resolves.
 */
export function viewEnabled(project: Project | null, view: ProjectView): boolean {
  if (!project) return false
  switch (view) {
    case "board":
      return project.is_kanban_activated !== false
    case "backlog":
      return project.is_backlog_activated !== false
    case "sprints":
      return project.is_backlog_activated !== false
    case "epics":
      return project.is_epics_activated !== false
    case "velocity":
      return project.is_backlog_activated !== false
  }
}
