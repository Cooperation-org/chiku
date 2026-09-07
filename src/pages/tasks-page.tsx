import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { toast } from "sonner"
import { Avatar } from "@/components/app/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  OptionsSelect,
  type SelectOption,
} from "@/components/inputs/options-select"
import { ProjectSelect } from "@/components/inputs/project-select"
import {
  PagePresence,
  PageTransition,
} from "@/components/layout/page-transition"
import { PageLoading } from "@/components/layout/page-state"
import { useMyTasks } from "@/lib/queries/stories"
import { useAuth } from "@/lib/stores/auth"
import {
  collectPeople,
  collectStatuses,
  collectTags,
  EMPTY_FILTER,
  filterFromParams,
  filterStories,
  filterToParams,
  isEmptyFilter,
  paramsHaveFilter,
  UNASSIGNED,
  type StoryFilter,
} from "@/lib/filters/stories"
import type { UserStory } from "@/lib/api/types"

function formatDue(
  dateStr: string | null
): { text: string; className: string } | null {
  if (!dateStr) return null
  const due = new Date(dateStr + "T00:00:00")
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - now.getTime()) / 86400000)
  const text = due.toLocaleDateString("en", { month: "short", day: "numeric" })
  if (diff < 0) return { text, className: "text-destructive" }
  if (diff <= 3) return { text, className: "text-amber-500" }
  return { text, className: "text-muted-foreground" }
}

const selectTriggerClass = "h-8 w-auto min-w-32 text-sm"

export default function TasksPage() {
  const navigate = useNavigate()
  const search = useRouterState({ select: (s) => s.location.search }) as Record<
    string,
    string
  >
  const { user } = useAuth()

  // The filter starts from the URL so filtered views are shareable links; a
  // bare /tasks defaults to "assigned to me". Closed stories are excluded
  // server-side unless the closed flag is on (status__is_closed param).
  const [filter, setFilter] = useState<StoryFilter>(() =>
    filterFromParams(new URLSearchParams(search))
  )
  const { data, isLoading, error } = useMyTasks(filter.showClosed)
  const ready = useRef(false)
  const searchInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!data || ready.current) return
    ready.current = true
    if (!paramsHaveFilter(new URLSearchParams(search)) && user) {
      setFilter((f) => ({ ...f, assignee: user.id }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // Keep the URL in step with the filter (debounced).
  useEffect(() => {
    if (!ready.current) return
    const timer = setTimeout(() => {
      const qs = filterToParams(filter).toString()
      const target = qs ? `/tasks?${qs}` : "/tasks"
      if (target !== window.location.pathname + window.location.search) {
        navigate({
          to: "/tasks",
          search: filterToParamsObject(filter),
          replace: true,
        })
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [filter, navigate])

  const stories = data?.stories ?? []
  const { assignees, creators } = useMemo(
    () => collectPeople(stories),
    [stories]
  )
  const statuses = useMemo(() => collectStatuses(stories), [stories])
  const availableTags = useMemo(() => collectTags(stories), [stories])
  const visible = useMemo(
    () => filterStories(stories, filter),
    [stories, filter]
  )
  const hasFilter = !isEmptyFilter(filter)

  function toggleTag(tag: string) {
    setFilter((f) => ({
      ...f,
      tags: f.tags.includes(tag)
        ? f.tags.filter((t) => t !== tag)
        : [...f.tags, tag],
    }))
  }

  function clearFilters() {
    setFilter((f) => ({ ...EMPTY_FILTER, showClosed: f.showClosed }))
  }

  // "/" focuses search, Esc clears it (like the old view).
  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      const typing = el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)
      if (e.key === "/" && !typing) {
        e.preventDefault()
        searchInput.current?.focus()
      } else if (e.key === "Escape" && el === searchInput.current) {
        setFilter((f) => ({ ...f, q: "" }))
      }
    }
    window.addEventListener("keydown", onKeydown)
    return () => window.removeEventListener("keydown", onKeydown)
  }, [])

  function openStory(story: UserStory) {
    const slug = story.project_extra_info?.slug
    if (slug) {
      navigate({
        to: "/projects/$slug/board/$storyRef",
        params: { slug, storyRef: String(story.ref) },
      })
    }
  }

  if (error) {
    toast.error((error as Error).message)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="space-y-3 border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative max-w-xl flex-1">
            <Input
              ref={searchInput}
              value={filter.q}
              onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
              type="search"
              placeholder="Search tasks â€” title, description, tag, person, #ref"
              className="pr-12"
            />
            {!filter.q && (
              <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                /
              </kbd>
            )}
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-sm">
            <Checkbox
              checked={filter.showClosed}
              onCheckedChange={(v) =>
                setFilter((f) => ({ ...f, showClosed: v === true }))
              }
            />
            Closed
          </label>
          {hasFilter && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <OptionsSelect
            value={filter.assignee === null ? "any" : String(filter.assignee)}
            onValueChange={(v) =>
              setFilter((f) => ({
                ...f,
                assignee:
                  v === "any"
                    ? null
                    : v === "unassigned"
                      ? UNASSIGNED
                      : Number(v),
              }))
            }
            options={
              [
                { value: "any", label: "Anyone assigned" },
                { value: "unassigned", label: "Unassigned" },
                ...assignees.map((person) => ({
                  value: String(person.id),
                  label: person.name,
                })),
              ] as SelectOption[]
            }
            triggerClassName={selectTriggerClass}
            ariaLabel="Assignee"
          />

          <OptionsSelect
            value={filter.creator === null ? "any" : String(filter.creator)}
            onValueChange={(v) =>
              setFilter((f) => ({
                ...f,
                creator: v === "any" ? null : Number(v),
              }))
            }
            options={
              [
                { value: "any", label: "Any creator" },
                ...creators.map((person) => ({
                  value: String(person.id),
                  label: person.name,
                })),
              ] as SelectOption[]
            }
            triggerClassName={selectTriggerClass}
            ariaLabel="Created by"
          />

          <ProjectSelect
            valueKey="id"
            value={filter.project === null ? "none" : String(filter.project)}
            onValueChange={(v) =>
              setFilter((f) => ({
                ...f,
                project: v === "none" ? null : Number(v),
              }))
            }
            includeNone
            noneLabel="All projects"
            triggerClassName={selectTriggerClass}
            ariaLabel="Project"
          />

          <OptionsSelect
            value={filter.status || "any"}
            onValueChange={(v) =>
              setFilter((f) => ({ ...f, status: v === "any" ? "" : v }))
            }
            options={
              [
                { value: "any", label: "Any status" },
                ...statuses.map((name) => ({ value: name, label: name })),
              ] as SelectOption[]
            }
            triggerClassName={selectTriggerClass}
            ariaLabel="Status"
          />

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>Due</span>
            <Input
              type="date"
              value={filter.dueFrom}
              onChange={(e) =>
                setFilter((f) => ({ ...f, dueFrom: e.target.value }))
              }
              className="h-8 w-36"
              aria-label="Due from"
            />
            <span>to</span>
            <Input
              type="date"
              value={filter.dueTo}
              onChange={(e) =>
                setFilter((f) => ({ ...f, dueTo: e.target.value }))
              }
              className="h-8 w-36"
              aria-label="Due to"
            />
          </div>
        </div>

        {availableTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={filter.tags.includes(tag)}
                className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                  filter.tags.includes(tag)
                    ? "border-primary bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <PagePresence>
          {isLoading ? (
            <PageLoading key="loading" label="Loading tasks" />
          ) : visible.length === 0 ? (
            <PageTransition key="empty">
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <div className="text-muted-foreground">
                  {hasFilter
                    ? "No tasks match these filters"
                    : "No tasks found"}
                </div>
                {hasFilter && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            </PageTransition>
          ) : (
            <PageTransition key="tasks">
              <table className="w-full">
                <thead className="sticky top-0 border-b bg-background/95 backdrop-blur">
                  <tr className="text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    <th className="px-6 py-3">Story</th>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Assigned</th>
                    <th className="px-4 py-3">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {visible.map((story) => {
                    const due = formatDue(story.due_date)
                    return (
                      <tr
                        key={story.id}
                        className="cursor-pointer transition-colors hover:bg-accent/40"
                        onClick={() => openStory(story)}
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                              #{story.ref}
                            </span>
                            <span className="max-w-md truncate text-sm">
                              {story.subject}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {story.project_extra_info?.name || ""}
                        </td>
                        <td className="px-4 py-3">
                          {story.status_extra_info && (
                            <span
                              className="rounded px-2 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: `${story.status_extra_info.color}30`,
                                color: story.status_extra_info.color,
                              }}
                            >
                              {story.status_extra_info.name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {story.assigned_to_extra_info ? (
                            <span className="flex items-center gap-2">
                              <Avatar
                                name={
                                  story.assigned_to_extra_info.full_name_display
                                }
                                photo={story.assigned_to_extra_info.photo}
                                size="sm"
                              />
                              {story.assigned_to_extra_info.full_name_display}
                            </span>
                          ) : (
                            "Unassigned"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {due && (
                            <span
                              className={`text-xs font-medium ${due.className}`}
                            >
                              {due.text}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </PageTransition>
          )}
        </PagePresence>
      </div>

      <div className="border-t px-6 py-2 text-xs text-muted-foreground">
        {visible.length} of {stories.length} task
        {stories.length !== 1 ? "s" : ""}
        {data && !data.loadedEverything && (
          <span className="text-amber-500">
            {" "}
            â€” too many to load; showing the most recent {stories.length}
          </span>
        )}
      </div>
    </div>
  )
}

/** URLSearchParams â†’ TanStack search object (flat strings, "" omitted). */
function filterToParamsObject(f: StoryFilter): Record<string, string> {
  const out: Record<string, string> = {}
  filterToParams(f).forEach((v, k) => {
    if (v) out[k] = v
  })
  return out
}
