import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { defaultFilter } from "cmdk"
import {
  CirclePlus,
  CircleUserRound,
  KanbanSquare,
  Keyboard,
  Layers,
  LineChart,
  ListFilter,
  ListTodo,
  Loader,
  Moon,
  Rows3,
  Sun,
  Users,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { ShortcutHint } from "@/components/ui/shortcut-kbd"
import { openShortcutsHelp } from "@/lib/stores/shortcuts-help"
import { SETTINGS_SECTIONS } from "@/components/settings/settings-nav"
import { PROJECT_VIEWS, viewEnabled } from "@/lib/project-views"
import { canDeleteProject, isProjectAdmin } from "@/lib/permissions"
import { useProjects, useProjectBySlug } from "@/lib/queries/projects"
import { useSearch } from "@/lib/queries/stories"
import { isArchived } from "@/lib/api/projects"
import { useCommandPaletteStore } from "@/lib/stores/command-palette"
import { useCreateProjectStore } from "@/lib/stores/create-project"
import { useProjectStore } from "@/lib/stores/project"
import { useTheme } from "@/lib/stores/theme"

const VIEW_ICONS = {
  board: KanbanSquare,
  backlog: Rows3,
  epics: Layers,
  velocity: LineChart,
} as const

/** Value of in-flight/hint rows the custom filter always keeps visible. */
const SEARCH_MARKER = "__searching__"

/**
 * The app-wide command palette: one cmdk dialog with three pre-scoped entry
 * modes. `all` (⌘K) offers server search plus every command; `nav` (V→C)
 * scopes to navigation; `projects` (⌘⇧P tap) scopes to project switching.
 */
export function CommandPalette() {
  const open = useCommandPaletteStore((s) => s.open)
  const mode = useCommandPaletteStore((s) => s.mode)
  const setOpen = useCommandPaletteStore((s) => s.setOpen)
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

  const params = useParams({ strict: false })
  const urlSlug = (params as { slug?: string }).slug ?? null
  const selectedSlug = useProjectStore((s) => s.selectedSlug)
  const setSelectedSlug = useProjectStore((s) => s.setSelectedSlug)
  const slug = urlSlug ?? selectedSlug
  const { project } = useProjectBySlug(slug ?? undefined)
  const { data: projects } = useProjects()

  const [query, setQuery] = useState("")
  const trimmed = query.trim()

  // Fresh input every time the palette opens or re-scopes.
  useEffect(() => {
    setQuery("")
  }, [open, mode])

  function close() {
    setOpen(false)
  }

  function switchTo(nextSlug: string) {
    setSelectedSlug(nextSlug)
    close()
    navigate({ to: "/projects/$slug/board", params: { slug: nextSlug } })
  }

  function go(to: "/tasks" | "/account") {
    close()
    navigate({ to })
  }

  function goView(view: string) {
    if (!slug) return
    close()
    navigate({ to: `/projects/$slug/${view}`, params: { slug } })
  }

  const showSearch = mode !== "projects" && trimmed.length >= 2
  const {
    data: results,
    isFetching: searchFetching,
  } = useSearch(project?.id ?? null, trimmed)
  const searching = showSearch && slug != null && searchFetching && !results
  const stories = results?.userstories ?? []
  const epics = results?.epics ?? []

  // cmdk hides items that don't textually match the query — the in-flight
  // marker would vanish exactly when it matters. exempt it from filtering.
  const commandFilter = useCallback(
    (value: string, search: string, keywords?: string[]) =>
      value === SEARCH_MARKER ? 1 : defaultFilter(value, search, keywords),
    [],
  )

  const activeProjects = (projects ?? []).filter((p) => !isArchived(p))
  const showViews = mode !== "projects" && slug != null
  const showSettings =
    mode !== "projects" && slug != null && (!project || isProjectAdmin(project))
  const showProjects = mode !== "nav"
  const showActions = mode === "all"

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command palette"
      description="Search stories and run commands"
      className="top-1/4 sm:max-w-xl"
      filter={commandFilter}
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={
          mode === "projects"
            ? "Switch project…"
            : mode === "nav"
              ? "Go to…"
              : "Search or run a command…"
        }
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {showSearch && (
          <CommandGroup heading="Search results">
            {searching && (
              <CommandItem disabled value={SEARCH_MARKER}>
                <Loader className="animate-spin" />
                Searching stories and epics…
              </CommandItem>
            )}
            {!searching && slug == null && (
              <CommandItem disabled value={SEARCH_MARKER}>
                Select a project to search its stories
              </CommandItem>
            )}
            {stories.slice(0, 8).map((s) => (
              <CommandItem
                key={`story-${s.id}`}
                value={`story ${s.ref} ${s.subject}`}
                onSelect={() => {
                  if (!slug) return
                  close()
                  navigate({
                    to: "/projects/$slug/board/$storyRef",
                    params: { slug, storyRef: String(s.ref) },
                  })
                }}
              >
                <span className="text-muted-foreground font-mono text-xs">#{s.ref}</span>
                <span className="min-w-0 flex-1 truncate">{s.subject}</span>
              </CommandItem>
            ))}
            {epics.slice(0, 5).map((e) => (
              <CommandItem
                key={`epic-${e.id}`}
                value={`epic ${e.ref} ${e.subject}`}
                onSelect={() => goView("epics")}
              >
                <span className="text-muted-foreground font-mono text-xs">#{e.ref}</span>
                <span className="min-w-0 flex-1 truncate">{e.subject}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showViews && (
          <CommandGroup heading="Navigation">
            {PROJECT_VIEWS.filter((v) => viewEnabled(project ?? null, v.key)).map((v) => {
              const Icon = VIEW_ICONS[v.key]
              return (
                <CommandItem key={v.key} value={v.label} onSelect={() => goView(v.key)}>
                  <Icon />
                  {v.label}
                </CommandItem>
              )
            })}
            <CommandItem value="My Tasks" onSelect={() => go("/tasks")}>
              <ListTodo />
              My Tasks
            </CommandItem>
            <CommandItem value="Members" onSelect={() => goView("members")}>
              <Users />
              Members
            </CommandItem>
            <CommandItem value="Account" onSelect={() => go("/account")}>
              <CircleUserRound />
              Account
            </CommandItem>
          </CommandGroup>
        )}

        {showSettings && (
          <CommandGroup heading="Settings">
            {SETTINGS_SECTIONS.filter((s) => !s.requiresDelete || canDeleteProject(project)).map(
              (s) => {
                const Icon = s.icon
                return (
                  <CommandItem
                    key={s.key}
                    value={`project settings ${s.label}`}
                    onSelect={() => {
                      if (!slug) return
                      close()
                      navigate({ to: s.route, params: { slug } })
                    }}
                  >
                    <Icon />
                    {s.label}
                    <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                      {s.description}
                    </span>
                  </CommandItem>
                )
              },
            )}
          </CommandGroup>
        )}

        {showProjects && (
          <CommandGroup heading="Projects">
            {activeProjects.map((p) => (
              <CommandItem
                key={p.id}
                value={p.name}
                onSelect={() => switchTo(p.slug)}
              >
                <span
                  aria-hidden
                  className="bg-primary/15 text-primary flex size-4 shrink-0 items-center justify-center rounded-sm text-[10px] font-semibold"
                >
                  {p.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                {p.slug === slug && (
                  <CommandShortcut>current</CommandShortcut>
                )}
              </CommandItem>
            ))}
            {activeProjects.length === 0 && (
              <CommandItem disabled value="no projects">
                No projects yet
              </CommandItem>
            )}
            <CommandItem
              value="New project"
              onSelect={() => {
                close()
                useCreateProjectStore.getState().setOpen(true)
              }}
            >
              <CirclePlus />
              New project
            </CommandItem>
          </CommandGroup>
        )}

        {showActions && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              {trimmed.length >= 2 && slug && (
                <CommandItem
                  value={`filter board ${trimmed}`}
                  onSelect={() => {
                    close()
                    navigate({
                      to: "/projects/$slug/board",
                      params: { slug },
                      search: { q: trimmed },
                    })
                  }}
                >
                  <ListFilter />
                  Filter board by “{trimmed}”
                </CommandItem>
              )}
              <CommandItem
                value="Toggle theme"
                onSelect={() => {
                  toggle()
                  close()
                }}
              >
                {theme === "dark" ? <Sun /> : <Moon />}
                Toggle theme
              </CommandItem>
              <CommandItem
                value="Keyboard shortcuts"
                onSelect={() => {
                  close()
                  openShortcutsHelp()
                }}
              >
                <Keyboard />
                Keyboard shortcuts
                <CommandShortcut>
                  <ShortcutHint id="help.shortcuts" />
                </CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
