import { create } from "zustand"

/**
 * Create-project dialog trigger, lifted from the ProjectSwitcher so the
 * command palette can open it too. The dialog itself stays rendered inside
 * the switcher (always mounted via the sidebar).
 */
interface CreateProjectState {
  open: boolean
  setOpen: (open: boolean) => void
}

export const useCreateProjectStore = create<CreateProjectState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
