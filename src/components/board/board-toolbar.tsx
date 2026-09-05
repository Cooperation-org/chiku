import { Check, Settings2 } from "lucide-react"
import { ProjectSwitcher } from "@/components/board/project-switcher"
import { SearchField } from "@/components/layout/search-field"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useBoardStore } from "@/lib/stores/board"

interface BoardToolbarProps {
  slug: string
  search: string
  onSearchChange: (value: string) => void
  onEditColumns: () => void
}

/** The single consolidated bar: project switcher · search · view options · settings. */
export function BoardToolbar({ slug, search, onSearchChange, onEditColumns }: BoardToolbarProps) {
  const showLabels = useBoardStore((s) => s.showLabels)
  const setShowLabels = useBoardStore((s) => s.setShowLabels)

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <ProjectSwitcher slug={slug} />

      <SearchField
        value={search}
        onChange={onSearchChange}
        placeholder="Search or go to…"
        className="max-w-xl flex-1"
      />

      <div className="ml-auto flex shrink-0 items-center gap-1">
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
          onClick={onEditColumns}
          title="Configure board"
          aria-label="Configure board"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
