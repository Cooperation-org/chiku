import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ShortcutHint } from "@/components/ui/shortcut-kbd"
import { SHORTCUTS, type ShortcutDef } from "@/lib/hotkeys/shortcuts"
import { useShortcutsHelpStore } from "@/lib/stores/shortcuts-help"

const GROUP_ORDER: ShortcutDef["group"][] = ["Palette", "Projects", "General"]

/** Registry-driven cheat sheet — always in sync with actual behavior. */
export function ShortcutsHelpDialog() {
  const open = useShortcutsHelpStore((s) => s.open)
  const setOpen = useShortcutsHelpStore((s) => s.setOpen)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Mod means ⌘ on macOS and Ctrl on Windows/Linux.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-4 pb-4">
          {GROUP_ORDER.map((group) => {
            const items = SHORTCUTS.filter((s) => s.group === group)
            if (items.length === 0) return null
            return (
              <section key={group}>
                <h3 className="text-muted-foreground px-1 py-1 text-[11px] font-medium tracking-wider uppercase">
                  {group}
                </h3>
                <ul className="divide-y">
                  {items.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-4 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <p className="text-muted-foreground text-xs">{s.description}</p>
                      </div>
                      <ShortcutHint id={s.id} className="shrink-0" />
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
