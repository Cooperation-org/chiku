import { useNavigate, useParams, useSearch } from "@tanstack/react-router"
import { Check, ChevronDown, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useMilestones } from "@/lib/queries/milestones"
import { useStories } from "@/lib/queries/stories"
import { useProjectBySlug } from "@/lib/queries/projects"
import { openSprintsSorted, parseSprintIdsParam, unfinishedStories } from "@/lib/sprints"

/**
 * Sprint scope picker, hosted in the breadcrumb trail after the "Board"
 * crumb via route staticData. Scope lives in the URL (`?sprint=12,13`),
 * so it survives refreshes and is shareable; the board consumes the same
 * param through the route. Absent/empty = all tasks. Multiple open sprints
 * can be selected at once — Taiga models sprints as plain `{ closed }`
 * milestones with no single-active constraint.
 */
export function SprintScopeCrumb() {
  const { slug } = useParams({ strict: false }) as { slug?: string }
  const search = useSearch({ strict: false }) as { sprint?: string | number }
  const navigate = useNavigate()
  const { project } = useProjectBySlug(slug)
  const projectId = project?.id ?? null
  const { data: milestones, isLoading, isError, refetch } = useMilestones(projectId)
  const { data: stories } = useStories(projectId)

  const selectedIds = parseSprintIdsParam(search.sprint)
  const selected = new Set(selectedIds)
  const open = openSprintsSorted(milestones ?? [])
  const closed = (milestones ?? [])
    .filter((m) => m.closed)
    .sort((a, b) => +new Date(b.estimated_start) - +new Date(a.estimated_start))
  const known = (milestones ?? []).filter((m) => selected.has(m.id))

  function writeScope(ids: number[]) {
    // Route-agnostic like BacklogFilterControl: the search shape is unknown
    // here, so the updater result must satisfy the `never` fallback.
    navigate({
      search: (prev) =>
        ({
          ...(prev as Record<string, unknown>),
          sprint: ids.length > 0 ? ids.join(",") : undefined,
        }) as never,
      replace: true,
    })
  }

  function toggle(id: number) {
    writeScope(selected.has(id) ? selectedIds.filter((sid) => sid !== id) : [...selectedIds, id])
  }

  const label = isLoading
    ? "Sprints…"
    : selectedIds.length === 0
      ? "All tasks"
      : known.length > 0
        ? `${known[0].name}${selectedIds.length > 1 ? ` +${selectedIds.length - 1}` : ""}`
        : `${selectedIds.length} selected`

  return (
    <DropdownMenu>
      {/* Prop-forwarding Button (not a wrapper) so Base UI can attach the
          open/close handlers and ref — same lesson as the date pickers. */}
      <DropdownMenuTrigger
        aria-label="Sprint scope"
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-6 max-w-44 gap-0.5 px-1.5 text-xs font-normal"
          >
            <span className="min-w-0 truncate">{label}</span>
            <ChevronDown className="size-3.5 shrink-0 opacity-60" />
          </Button>
        }
      />
      <DropdownMenuContent className="min-w-56" align="start">
        {isLoading ? (
          <>
            <DropdownMenuItem disabled>
              <Skeleton className="h-4 w-32" />
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Skeleton className="h-4 w-24" />
            </DropdownMenuItem>
          </>
        ) : isError ? (
          <>
            <DropdownMenuItem disabled>
              <span className="text-destructive">Couldn’t load sprints</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void refetch()}>
              <RotateCcw />
              Try again
            </DropdownMenuItem>
          </>
        ) : (milestones ?? []).length === 0 ? (
          <>
            <DropdownMenuItem disabled>No sprints yet</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                slug &&
                navigate({ to: "/projects/$slug/sprints", params: { slug } })
              }
            >
              Go to Sprints
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={() => writeScope([])}>
              <span className="min-w-0 flex-1 truncate">All tasks</span>
              {selectedIds.length === 0 && <Check className="size-4 shrink-0" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {open.length > 0 && (
              <DropdownMenuGroup>
                <DropdownMenuLabel>Open sprints</DropdownMenuLabel>
                {open.map((m) => (
                  <DropdownMenuCheckboxItem
                    key={m.id}
                    checked={selected.has(m.id)}
                    closeOnClick={false}
                    onCheckedChange={() => toggle(m.id)}
                  >
                    <span className="min-w-0 flex-1 truncate">{m.name}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {unfinishedStories(stories ?? [], m.id).length}
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            )}
            {closed.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Closed</DropdownMenuLabel>
                  {closed.map((m) => (
                    <DropdownMenuCheckboxItem
                      key={m.id}
                      checked={selected.has(m.id)}
                      closeOnClick={false}
                      onCheckedChange={() => toggle(m.id)}
                      className="text-muted-foreground"
                    >
                      <span className="min-w-0 flex-1 truncate">{m.name}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
SprintScopeCrumb.displayName = "SprintScopeCrumb"
