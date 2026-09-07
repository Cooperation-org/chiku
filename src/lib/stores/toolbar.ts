import { create } from "zustand"

interface ToolbarState {
  /** Shared search text: drives the toolbar field, the server palette, and the board filter. */
  search: string
  setSearch: (value: string) => void
}

export const useToolbarStore = create<ToolbarState>((set) => ({
  search: "",
  setSearch: (value) => set({ search: value }),
}))
