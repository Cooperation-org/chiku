import { create } from "zustand"

const COLLAPSED_KEY = "board_collapsed_columns"
const LABELS_KEY = "board_show_labels"

function readCollapsedColumns(): number[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "[]") as number[]
  } catch {
    return []
  }
}

function readShowLabels(): boolean {
  if (typeof window === "undefined") return true
  return localStorage.getItem(LABELS_KEY) !== "false"
}

interface BoardState {
  /** Column (status) ids currently collapsed to the icon rail. */
  collapsedColumns: number[]
  showLabels: boolean
  /** Column-editor dialog visibility — opened from the toolbar, so it lives here. */
  columnEditorOpen: boolean
  toggleColumn: (statusId: number) => void
  setShowLabels: (show: boolean) => void
  setColumnEditorOpen: (open: boolean) => void
}

export const useBoardStore = create<BoardState>((set, get) => ({
  collapsedColumns: readCollapsedColumns(),
  showLabels: readShowLabels(),
  columnEditorOpen: false,
  toggleColumn: (statusId) => {
    const next = get().collapsedColumns.includes(statusId)
      ? get().collapsedColumns.filter((id) => id !== statusId)
      : [...get().collapsedColumns, statusId]
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next))
    set({ collapsedColumns: next })
  },
  setShowLabels: (show) => {
    localStorage.setItem(LABELS_KEY, String(show))
    set({ showLabels: show })
  },
  setColumnEditorOpen: (open) => set({ columnEditorOpen: open }),
}))
