import { create } from "zustand"

const COLLAPSED_KEY = "sidebar_collapsed"
const SECTIONS_KEY = "sidebar_sections"

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(COLLAPSED_KEY) === "true"
}

function readSections(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(SECTIONS_KEY) ?? "{}") as Record<string, boolean>
  } catch {
    return {}
  }
}

function persistSections(sections: Record<string, boolean>) {
  localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections))
}

interface SidebarState {
  /** Icon rail mode (desktop). */
  collapsed: boolean
  /** Overlay sheet open (mobile). */
  mobileOpen: boolean
  /** Open/closed collapsible sections, keyed by section id. */
  sections: Record<string, boolean>
  toggle: () => void
  setMobileOpen: (open: boolean) => void
  isSectionOpen: (id: string) => boolean
  toggleSection: (id: string) => void
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  collapsed: readCollapsed(),
  mobileOpen: false,
  sections: readSections(),
  toggle: () => {
    const next = !get().collapsed
    localStorage.setItem(COLLAPSED_KEY, String(next))
    set({ collapsed: next })
  },
  setMobileOpen: (open) => set({ mobileOpen: open }),
  isSectionOpen: (id) => get().sections[id] ?? true,
  toggleSection: (id) => {
    const sections = { ...get().sections, [id]: !(get().sections[id] ?? true) }
    persistSections(sections)
    set({ sections })
  },
}))
