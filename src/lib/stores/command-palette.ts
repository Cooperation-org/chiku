import { create } from "zustand"

/** Pre-scoped palette entry points: ⌘K opens `all`, V→C `nav`, ⌘⇧P `projects`. */
export type PaletteMode = "all" | "nav" | "projects"

interface CommandPaletteState {
  open: boolean
  mode: PaletteMode
  openPalette: (mode?: PaletteMode) => void
  setOpen: (open: boolean) => void
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  open: false,
  mode: "all",
  openPalette: (mode = "all") => set({ open: true, mode }),
  setOpen: (open) => set({ open }),
}))
