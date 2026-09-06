import { Check, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useBoardStore } from "@/lib/stores/board"

/** Board-only toolbar controls, declared by the board route via staticData. */
export function BoardViewOptions() {
  const showLabels = useBoardStore((s) => s.showLabels)
  const setShowLabels = useBoardStore((s) => s.setShowLabels)
  const setColumnEditorOpen = useBoardStore((s) => s.setColumnEditorOpen)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" title="View options" aria-label="View options" />
          }
        >
          <Settings2 className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onClick={() => setShowLabels(!showLabels)}
            className="flex items-center justify-between"
          >
            Show labels
            {showLabels && <Check className="text-primary h-4 w-4" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setColumnEditorOpen(true)}
        title="Configure board"
        aria-label="Configure board"
      >
        <Settings2 className="h-4 w-4" />
      </Button>
    </>
  )
}
