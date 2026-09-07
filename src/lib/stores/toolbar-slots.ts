import { create } from "zustand"

/**
 * Portal targets inside the app toolbar. The story view renders its header
 * groups into these via `createPortal`, so all header state/handlers stay
 * inside IssueModal. Nodes are registered with ref callbacks (stable
 * module-level fns in story-slots.tsx) — no effects involved.
 */
interface ToolbarSlotsState {
  breadcrumbEl: HTMLElement | null
  actionsEl: HTMLElement | null
  setBreadcrumbEl: (el: HTMLElement | null) => void
  setActionsEl: (el: HTMLElement | null) => void
}

export const useToolbarSlots = create<ToolbarSlotsState>((set) => ({
  breadcrumbEl: null,
  actionsEl: null,
  setBreadcrumbEl: (el) => set({ breadcrumbEl: el }),
  setActionsEl: (el) => set({ actionsEl: el }),
}))
