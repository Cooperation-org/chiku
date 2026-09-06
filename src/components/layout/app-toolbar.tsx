import type { ComponentType } from "react"
import { useMatches } from "@tanstack/react-router"
import { AnimatePresence, motion } from "motion/react"
import { Moon, Sun } from "lucide-react"
import { SearchField } from "@/components/layout/search-field"
import { SearchPalette } from "@/components/board/search-palette"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useToolbarStore } from "@/lib/stores/toolbar"
import { useTheme } from "@/lib/stores/theme"

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    /** Toolbar action controls declared by the route; rendered in the app bar. */
    toolbarControls?: ComponentType[]
  }
}

/** Shared spring so every toolbar item glides on the same physics. */
const toolbarSpring = { type: "spring", stiffness: 500, damping: 38 } as const

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

      <motion.div layout transition={toolbarSpring} className="relative max-w-xl flex-1">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search or go to…"
          className="w-full"
        />
        <SearchPalette slug={slug ?? ""} text={search} />
      </motion.div>

      <motion.div layout transition={toolbarSpring} className="ml-auto flex shrink-0 items-center gap-1">
        <motion.div layout transition={toolbarSpring}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme" />
              }
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </TooltipTrigger>
            <TooltipContent side="bottom">Toggle theme</TooltipContent>
          </Tooltip>
        </motion.div>

        <AnimatePresence mode="popLayout" initial={false}>
          {controls.map((Control) => (
            <motion.div
              key={Control.displayName ?? Control.name}
              layout
              transition={toolbarSpring}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
            >
              <Control />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
