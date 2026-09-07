import { create } from "zustand"

const KEY = "selected_project_slug"

function readSavedSlug(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(KEY)
}

interface ProjectState {
  /**
   * The last project the visitor deliberately navigated to. Written by
   * navigation handlers (sidebar, switcher, home loader) — never synced from
   * render — so slug-less routes (/tasks) can link back to a project.
   */
  selectedSlug: string | null
  setSelectedSlug: (slug: string) => void
  getSavedSlug: () => string | null
}

export const useProjectStore = create<ProjectState>((set) => ({
  selectedSlug: readSavedSlug(),
  setSelectedSlug: (slug) => {
    if (slug) {
      localStorage.setItem(KEY, slug)
    } else {
      localStorage.removeItem(KEY)
    }
    set({ selectedSlug: slug })
  },
  getSavedSlug: readSavedSlug,
}))
