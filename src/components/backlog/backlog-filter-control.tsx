import { useNavigate, useSearch } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

/**
 * The backlog filter, hosted in the app toolbar via staticData. State lives
 * in the URL (?q=…), so it survives refreshes and is shareable; the table
 * consumes the same param through the route.
 */
export function BacklogFilterControl() {
  const search = useSearch({ strict: false }) as { q?: string }
  const navigate = useNavigate()

  return (
    <div className="relative">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
      <Input
        value={search.q ?? ""}
        onChange={(e) =>
          // The toolbar control is route-agnostic (mounted via staticData),
          // so the route search shape is unknown here and the reducer must
          // satisfy the `never` fallback TanStack Router types it as.
          navigate({
            search: (prev) =>
              ({ ...(prev as Record<string, unknown>), q: e.target.value || undefined }) as never,
            replace: true,
          })
        }
        placeholder="Filter stories…"
        className="h-7 w-40 pl-8 font-mono text-xs transition-[width] focus:w-52"
        aria-label="Filter backlog"
      />
    </div>
  )
}
