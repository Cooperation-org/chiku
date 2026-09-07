import { create } from "zustand"

interface ShortcutsHelpState {
  open: boolean
  setOpen: (open: boolean) => void
}

/** Cheat-sheet visibility, shared by the `?` hotkey and the palette command. */
export const useShortcutsHelpStore = create<ShortcutsHelpState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))

/** Opened from the palette ("Keyboard shortcuts") or the `?` hotkey. */
export function openShortcutsHelp() {
  useShortcutsHelpStore.getState().setOpen(true)
}
