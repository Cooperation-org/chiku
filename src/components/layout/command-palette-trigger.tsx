import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ShortcutHint } from "@/components/ui/shortcut-kbd"
import { useCommandPaletteStore } from "@/lib/stores/command-palette"

/** Toolbar search button per the shadcn command-palette pattern. */
export function CommandPaletteTrigger() {
  const openPalette = useCommandPaletteStore((s) => s.openPalette)

  return (
    <Button
      variant="outline"
      className="text-muted-foreground justify-start gap-2 px-3"
      onClick={() => openPalette("all")}
    >
      <Search className="size-4 shrink-0 opacity-50" />
      <span>Search…</span>
      <ShortcutHint id="palette.open" className="ml-auto" />
    </Button>
  )
}
