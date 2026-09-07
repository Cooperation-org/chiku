import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { useSearch } from "@/lib/queries/stories"
import { useProjectBySlug } from "@/lib/queries/projects"

interface SearchPaletteProps {
  slug: string
  text: string
}

/**
 * Server-search results dropdown, anchored under the toolbar search field.
 * `/search` requires a project â€” results are scoped to the active one.
 * Pure derived state: no effects, no debounce timer; TanStack dedupes repeats.
 */
export function SearchPalette({ slug, text }: SearchPaletteProps) {
  const navigate = useNavigate()
  const { project } = useProjectBySlug(slug)
  const trimmed = text.trim()
  const { data, isPending } = useSearch(project?.id ?? null, trimmed)

  // A dismissed box stays dismissed until the text changes again.
  const [dismissedFor, setDismissed] = useState("")
  const dismissed = dismissedFor !== "" && dismissedFor === text

  if (trimmed.length < 2 || dismissed || (!data && !isPending)) return null

  const stories = data?.userstories ?? []
  const epics = data?.epics ?? []
  const extra =
    (data?.tasks?.length ?? 0) + (data?.issues?.length ?? 0) + ((data?.wiki_pages?.length) ?? 0)

  return (
    <div className="bg-popover text-popover-foreground absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg border shadow-lg">
      <div className="flex items-center justify-between border-b px-3 py-1.5">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Search className="h-3 w-3" />
          {isPending ? "Searchingâ€¦" : `${data?.count ?? 0} result${data?.count === 1 ? "" : "s"}`}
        </span>
        <button
          onClick={() => setDismissed(text)}
          className="text-muted-foreground hover:text-foreground rounded px-1 text-xs"
          title="Dismiss"
        >
          Esc
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {stories.length > 0 && (
          <div className="p-1.5">
            <div className="text-muted-foreground px-2 py-1 text-[11px] font-medium tracking-wider uppercase">
              Stories
            </div>
            {stories.slice(0, 8).map((s) => (
              <button
                key={`story-${s.id}`}
                onClick={() =>
                  navigate({
                    to: "/projects/$slug/board/$storyRef",
                    params: { slug, storyRef: String(s.ref) },
                  })
                }
                className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
              >
                <span className="text-muted-foreground font-mono text-xs">#{s.ref}</span>
                <span className="min-w-0 flex-1 truncate">{s.subject}</span>
              </button>
            ))}
          </div>
        )}

        {epics.length > 0 && (
          <div className="border-t p-1.5">
            <div className="text-muted-foreground px-2 py-1 text-[11px] font-medium tracking-wider uppercase">
              Epics
            </div>
            {epics.slice(0, 5).map((e) => (
              <button
                key={`epic-${e.id}`}
                onClick={() => navigate({ to: "/projects/$slug/epics", params: { slug } })}
                className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
              >
                <span className="text-muted-foreground font-mono text-xs">#{e.ref}</span>
                <span className="min-w-0 flex-1 truncate">{e.subject}</span>
              </button>
            ))}
          </div>
        )}

        {!isPending && stories.length === 0 && epics.length === 0 && (
          <div className="text-muted-foreground px-3 py-4 text-center text-sm">
            No results for â€œ{trimmed}â€
          </div>
        )}

        {extra > 0 && (
          <div className="text-muted-foreground border-t px-3 py-1.5 text-xs">
            +{extra} more in tasks / issues / wiki
          </div>
        )}
      </div>
    </div>
  )
}
