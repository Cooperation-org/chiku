import { useNavigate } from "@tanstack/react-router"
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
import { unfinishedStories } from "@/lib/sprints"
import { useSprintScope } from "@/components/sprints/use-sprint-scope"

/**
 * Sprint scope picker, hosted in the breadcrumb trail after the "Board"
 * crumb via route staticData. Scope lives in the URL (`?sprint=12,13`),
 * so it survives refreshes and is shareable; the board consumes the same
 * param through the route. Absent/empty = all tasks. Multiple open sprints
 * can be selected at once — Taiga models sprints as plain `{ closed }`
 * milestones with no single-active constraint.
 */
export function SprintScopeCrumb() {
  const navigate = useNavigate()
  const {
    slug,
    milestones,
    stories,
    milestonesLoading: isLoading,
    milestonesError: isError,
    retryMilestones: refetch,
    selectedIds,
    selected,
    open,
    closed,
    known,
    writeScope,
    toggle,
  } = useSprintScope()

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
        ) : milestones.length === 0 ? (
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
                      {unfinishedStories(stories, m.id).length}
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
