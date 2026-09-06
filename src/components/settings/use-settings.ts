import { createContext, useContext } from "react"
import type { Project } from "@/lib/api/types"

export interface SettingsContextValue {
  project: Project
  canEdit: boolean
  canDelete: boolean
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

/** Leaf subroutes consume the resolved project + edit rights from here. */
export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings must be used inside SettingsLayout")
  return ctx
}
