import type { ComponentType } from "react"
import { useMatches } from "@tanstack/react-router"
import { AnimatePresence, motion } from "motion/react"
import { Moon, Sun } from "lucide-react"
import { CommandPaletteTrigger } from "@/components/layout/command-palette-trigger"
import { SyncStatus } from "@/components/layout/sync-status"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "@/lib/stores/theme"

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    /** Breadcrumb controls declared by the route; rendered after the sidebar toggle. */
    toolbarBreadcrumbs?: ComponentType[]
    /** Toolbar action controls declared by the route; rendered in the app bar. */
    toolbarControls?: ComponentType[]
  }
}

/** Shared spring so every toolbar item glides on the same physics. */
const toolbarSpring = { type: "spring", stiffness: 500, damping: 38 } as const

/** The single app bar: trigger · command palette button · theme · route controls. */
export function AppToolbar() {
  const { theme, toggle } = useTheme()

  // Leaf match wins; matches only reflect committed navigations, so hovering
  // a prefetched link can never swap the toolbar.
  const matches = useMatches()
  const leafStatic = [...matches].reverse().find((m) => m.staticData)?.staticData
  const breadcrumbs = leafStatic?.toolbarBreadcrumbs ?? []
  const controls = leafStatic?.toolbarControls ?? []

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <SidebarTrigger aria-label="Toggle sidebar" />

      <div className="flex min-w-0 shrink-0 items-center gap-1">
        <AnimatePresence mode="popLayout" initial={false}>
          {breadcrumbs.map((Breadcrumb) => (
            <motion.div
              key={Breadcrumb.displayName ?? Breadcrumb.name}
              layout
              transition={toolbarSpring}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="flex min-w-0 items-center"
            >
              <Breadcrumb />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.div layout transition={toolbarSpring} className="relative max-w-xl flex-1">
        <CommandPaletteTrigger />
      </motion.div>

      <motion.div layout transition={toolbarSpring} className="ml-auto flex shrink-0 items-center gap-1">
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

        <AnimatePresence initial={false}>
          {controls.length > 0 && (
            <motion.span
              key="toolbar-separator"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              aria-hidden
              className="bg-border mx-1 h-5 w-px shrink-0"
            />
          )}
        </AnimatePresence>

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

        <motion.div layout transition={toolbarSpring}>
          <SyncStatus />
        </motion.div>
      </motion.div>
    </div>
  )
}
