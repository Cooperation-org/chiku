import type { HotkeySequence, RegisterableHotkey } from "@tanstack/react-hotkeys"

/**
 * The single source of truth for every app keyboard shortcut.
 *
 * Combos are stored in TanStack Hotkeys canonical form (`Mod` = ⌘ on macOS,
 * Ctrl on Windows/Linux — resolved at match time and at display time by the
 * library itself, so no per-OS branching lives here). Strings are checked
 * against the library's `Hotkey` template-literal unions at compile time.
 *
 * `AppHotkeys` registers the palette/help entries; `ProjectHoldPicker`
 * registers the project entries (they need the live projects list).
 * Every hint in the UI — palette rows, toolbar trigger, help dialog — renders
 * from this registry via <ShortcutHint>, so config and display cannot drift.
 */

export type ShortcutId =
  | "palette.open"
  | "palette.nav"
  | "projects.hold"
  | "help.shortcuts"

export interface ShortcutDef {
  id: ShortcutId
  group: "Palette" | "Projects" | "General"
  name: string
  description: string
  /** Canonical combo, e.g. "Mod+K" or a RawHotkey. Mutually exclusive with `sequence`. */
  hotkey?: RegisterableHotkey
  /** Multi-step sequence, e.g. ["Mod+Shift+P", "1"]. Mutually exclusive with `hotkey`. */
  sequence?: HotkeySequence
}

export const SHORTCUTS: ShortcutDef[] = [
  {
    id: "palette.open",
    group: "Palette",
    name: "Open command palette",
    description: "Search stories and run commands",
    hotkey: "Mod+K",
  },
  {
    id: "palette.nav",
    group: "Palette",
    name: "Go to…",
    description: "Jump straight to views, links and settings",
    sequence: ["V", "C"],
  },
  {
    id: "projects.hold",
    group: "Projects",
    name: "Switch project",
    description:
      "Tap Mod+Shift+P for the project list in the palette, or hold it and press P to cycle — release to confirm",
    hotkey: "Mod+Shift+P",
  },
  {
    id: "help.shortcuts",
    group: "General",
    name: "Keyboard shortcuts",
    description: "Show this cheat sheet",
    hotkey: { key: "?", shift: true },
  },
]

export function shortcutById(id: ShortcutId): ShortcutDef | undefined {
  return SHORTCUTS.find((s) => s.id === id)
}

/** Shared registration metadata so devtools and future help UIs stay rich. */
export function shortcutMeta(id: ShortcutId) {
  const def = shortcutById(id)
  return def ? { name: def.name, description: def.description } : undefined
}
