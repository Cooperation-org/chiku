import {
  HotkeysProvider,
  useHotkeys,
  useHotkeySequence,
} from "@tanstack/react-hotkeys"
import { openShortcutsHelp } from "@/lib/stores/shortcuts-help"
import { useCommandPaletteStore } from "@/lib/stores/command-palette"
import {
  SHORTCUTS,
  shortcutById,
  shortcutMeta,
  type ShortcutId,
} from "@/lib/hotkeys/shortcuts"

/**
 * Registers the palette + help hotkeys from the central registry. The
 * project-picker entries (`projects.pick`, `projects.hold`) are registered
 * inside ProjectHoldPicker — they need the live projects list.
 */
function AppHotkeyBindings() {
  const openPalette = useCommandPaletteStore((s) => s.openPalette)

  const owned: ShortcutId[] = ["palette.open", "help.shortcuts"]
  useHotkeys(
    SHORTCUTS.filter((s) => s.hotkey && owned.includes(s.id)).map((s) => ({
      hotkey: s.hotkey!,
      callback: () => {
        if (s.id === "palette.open") openPalette("all")
        else if (s.id === "help.shortcuts") openShortcutsHelp()
      },
      options: { meta: shortcutMeta(s.id) },
    })),
  )

  const nav = shortcutById("palette.nav")!
  useHotkeySequence(["V", "C"], () => openPalette("nav"), {
    meta: shortcutMeta(nav.id),
  })

  return null
}

/**
 * Central defaults for every registration in the authed app: sequences must
 * complete within 600ms of their leading combo, and duplicate registrations
 * warn during development instead of silently colliding.
 */
export function AppHotkeys({ children }: { children: React.ReactNode }) {
  return (
    <HotkeysProvider
      defaultOptions={{
        hotkey: { conflictBehavior: "warn" },
        hotkeySequence: { timeout: 600 },
      }}
    >
      <AppHotkeyBindings />
      {children}
    </HotkeysProvider>
  )
}
