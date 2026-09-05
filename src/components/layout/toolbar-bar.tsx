import { Menu } from "lucide-react"
import { SearchField } from "@/components/layout/search-field"
import { Button } from "@/components/ui/button"

interface ToolbarBarProps {
  onOpenSidebar: () => void
  search?: string
  onSearchChange?: (value: string) => void
}

/** The slim application bar beneath the (untouchable) cohort top bar. */
export function ToolbarBar({ onOpenSidebar, search, onSearchChange }: ToolbarBarProps) {
  return (
    <div className="bg-background/95 flex h-11 shrink-0 items-center gap-2 border-b px-2 backdrop-blur">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenSidebar}
        aria-label="Open navigation menu"
      >
        <Menu className="h-4 w-4" />
      </Button>
      <div className="flex flex-1 justify-center px-2">
        <SearchField value={search} onChange={onSearchChange} className="max-w-xl" />
      </div>
      <div className="w-9 shrink-0 md:hidden" aria-hidden />
    </div>
  )
}
