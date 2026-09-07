import { create } from "zustand"

const EXPANDED_KEY = "sidebar_expanded"
const SECTIONS_KEY = "sidebar_sections"

function readExpanded(): boolean {
  if (typeof window === "undefined") return true
  return localStorage.getItem(EXPANDED_KEY) !== "false"
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
  /** Expanded (vs the icon rail). Drives the shadcn SidebarProvider. */
  expanded: boolean
  /** Open/closed collapsible groups, keyed by section id. */
  sections: Record<string, boolean>
  setExpanded: (open: boolean) => void
  isSectionOpen: (id: string) => boolean
  toggleSection: (id: string) => void
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  expanded: readExpanded(),
  sections: readSections(),
  setExpanded: (open) => {
    localStorage.setItem(EXPANDED_KEY, String(open))
    set({ expanded: open })
  },
  isSectionOpen: (id) => get().sections[id] ?? true,
  toggleSection: (id) => {
    const sections = { ...get().sections, [id]: !(get().sections[id] ?? true) }
    persistSections(sections)
    set({ sections })
  },
}))
