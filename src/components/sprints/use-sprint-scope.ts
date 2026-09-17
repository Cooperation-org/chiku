import { useMemo } from "react"
import { useNavigate, useParams, useSearch } from "@tanstack/react-router"
import { useMilestones } from "@/lib/queries/milestones"
import { useStories } from "@/lib/queries/stories"
import { useProjectBySlug } from "@/lib/queries/projects"
import { openSprintsSorted, parseSprintIdsParam } from "@/lib/sprints"

/**
 * Shared sprint-scope state for the board's toolbar surfaces (breadcrumb
 * picker crumb + center sprint rail). Scope lives in the URL (`?sprint=12,13`)
 * — absent/empty means all tasks — and both surfaces read/write the same
 * param through the route, so they never disagree.
 */
export function useSprintScope() {
  const { slug } = useParams({ strict: false }) as { slug?: string }
  const search = useSearch({ strict: false }) as { sprint?: string | number }
  const navigate = useNavigate()
  const { project } = useProjectBySlug(slug)
  const projectId = project?.id ?? null
  const milestonesQuery = useMilestones(projectId)
  const storiesQuery = useStories(projectId)

  const milestones = milestonesQuery.data ?? []
  const stories = storiesQuery.data ?? []
  const selectedIds = parseSprintIdsParam(search.sprint)
  const selected = useMemo(() => new Set(selectedIds), [selectedIds])
  const open = useMemo(() => openSprintsSorted(milestones), [milestones])
  const closed = useMemo(
    () =>
      milestones
        .filter((m) => m.closed)
        .sort((a, b) => +new Date(b.estimated_start) - +new Date(a.estimated_start)),
    [milestones],
  )
  const known = useMemo(() => milestones.filter((m) => selected.has(m.id)), [milestones, selected])
  // Ids in the URL that match no loaded sprint (deleted, or milestones still
  // loading) — the board shows a slim notice for these instead of the banner.
  const unknownIds = useMemo(
    () => selectedIds.filter((id) => !milestones.some((m) => m.id === id)),
    [selectedIds, milestones],
  )

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

  return {
    slug,
    projectId,
    milestones,
    stories,
    milestonesLoading: milestonesQuery.isLoading,
    milestonesError: milestonesQuery.isError,
    retryMilestones: milestonesQuery.refetch,
    selectedIds,
    selected,
    open,
    closed,
    known,
    unknownIds,
    writeScope,
    toggle,
  }
}
