import { useNavigate } from "@tanstack/react-router"
import { Check, Settings2 } from "lucide-react"
import { SearchField } from "@/components/layout/search-field"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useProjects } from "@/lib/queries/projects"
import { isArchived } from "@/lib/api/projects"
import { useProjectStore } from "@/lib/stores/project"
import { useBoardStore } from "@/lib/stores/board"

interface BoardToolbarProps {
  slug: string
  search: string
  onSearchChange: (value: string) => void
  onEditColumns: () => void
}

/** GitLab board-toolbar row: board/project switcher Â· search Â· view options Â· settings. */
export function BoardToolbar({ slug, search, onSearchChange, onEditColumns }: BoardToolbarProps) {
  const navigate = useNavigate()
  const { data: projects } = useProjects()
  const setSelectedSlug = useProjectStore((s) => s.setSelectedSlug)
  const showLabels = useBoardStore((s) => s.showLabels)
  const setShowLabels = useBoardStore((s) => s.setShowLabels)

  const activeProjects = (projects ?? []).filter((p) => !isArchived(p))
  const current = activeProjects.find((p) => p.slug === slug)

  function switchProject(nextSlug: string) {
    setSelectedSlug(nextSlug)
    navigate({ to: "/p/$slug/board", params: { slug: nextSlug } })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
      <Select value={slug} onValueChange={(v) => v && switchProject(v)}>
        <SelectTrigger className="h-9 w-auto min-w-44 gap-1 font-medium">
          <SelectValue placeholder="Switch project">{current?.name ?? "Switch project"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {activeProjects.map((p) => (
            <SelectItem key={p.id} value={p.slug}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <SearchField
        value={search}
        onChange={onSearchChange}
        placeholder="Filter stories"
        showHint={false}
        className="max-w-md flex-1"
      />

      <div className="ml-auto flex items-center gap-1">
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

