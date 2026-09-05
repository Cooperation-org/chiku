import { create } from "zustand"

export type Theme = "dark" | "light"

const KEY = "theme"

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark"
  return localStorage.getItem(KEY) === "light" ? "light" : "dark"
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle("dark", theme === "dark")
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: readStoredTheme(),
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(KEY, theme)
    }
    applyTheme(theme)
    set({ theme })
  },
  toggle: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
}))

// Apply once at module load so the class always matches the stored theme,
// even before React mounts.
applyTheme(readStoredTheme())
