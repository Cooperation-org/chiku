import { useNavigate, useSearch } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

/**
 * The members filter, mounted in the app toolbar via staticData. State lives
 * in the URL (?q=…) so the filtered roster is shareable.
 */
export function MembersFilterControl() {
  const search = useSearch({ strict: false }) as { q?: string }
  const navigate = useNavigate()

  return (
    <div className="relative">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
      <Input
        value={search.q ?? ""}
        onChange={(e) =>
          navigate({
            search: (prev) => ({ ...prev, q: e.target.value || undefined }),
            replace: true,
          })
        }
        placeholder="Filter members…"
        className="h-7 w-40 pl-8 font-mono text-xs transition-[width] focus:w-52"
        aria-label="Filter members"
      />
    </div>
  )
}
