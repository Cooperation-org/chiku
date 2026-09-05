import { create } from "zustand"
import type { Project } from "@/lib/api/types"

function getSavedProjectId(): number | null {
  if (typeof window === "undefined") return null
  const saved = localStorage.getItem("selected_project_id")
  return saved ? parseInt(saved, 10) : null
}

interface ProjectState {
  currentProject: Project | null
  currentProjectSlug: string | null
  /** Select a project (persists the id to localStorage, like the old store). */
  setProject: (project: Project | null) => void
  setSlug: (slug: string | null) => void
  getSavedId: () => number | null
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  currentProjectSlug: null,
  setProject: (project) => {
    if (typeof window !== "undefined") {
      if (project) {
        localStorage.setItem("selected_project_id", String(project.id))
      } else {
        localStorage.removeItem("selected_project_id")
      }
    }
    set({ currentProject: project })
  },
  setSlug: (slug) => set({ currentProjectSlug: slug }),
  getSavedId: getSavedProjectId,
}))
