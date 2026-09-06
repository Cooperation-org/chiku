import type { ComponentType } from "react"
import { useMatches } from "@tanstack/react-router"
import { Moon, Sun } from "lucide-react"
import { SearchField } from "@/components/layout/search-field"
import { SearchPalette } from "@/components/board/search-palette"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useToolbarStore } from "@/lib/stores/toolbar"
import { useTheme } from "@/lib/stores/theme"

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    /** Toolbar action controls declared by the route; rendered in the app bar. */
    toolbarControls?: ComponentType[]
  }
}

/** The single app bar: trigger · search (+ palette) · theme · route controls. */
export function AppToolbar({ slug }: { slug: string | null }) {
  const search = useToolbarStore((s) => s.search)
  const setSearch = useToolbarStore((s) => s.setSearch)
  const { theme, toggle } = useTheme()

  // Leaf match wins; matches only reflect committed navigations, so hovering
  // a prefetched link can never swap the toolbar.
  const matches = useMatches()
  const controls =
    [...matches].reverse().find((m) => m.staticData?.toolbarControls)?.staticData
      .toolbarControls ?? []

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <SidebarTrigger aria-label="Toggle sidebar" />

      <div className="relative max-w-xl flex-1">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search or go to…"
          className="w-full"
        />
        <SearchPalette slug={slug ?? ""} text={search} />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {controls.map((Control, i) => (
          <Control key={i} />
        ))}
      </div>
    </div>
  )
}
