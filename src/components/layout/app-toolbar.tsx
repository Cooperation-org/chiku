import type { ComponentType } from "react"
import { useMatches } from "@tanstack/react-router"
import { AnimatePresence, motion } from "motion/react"
import { ChevronRight, Moon, Sun } from "lucide-react"
import { CommandPaletteTrigger } from "@/components/layout/command-palette-trigger"
import { NotificationsBell } from "@/components/notifications/notifications-bell"
import { SyncStatus } from "@/components/layout/sync-status"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "@/lib/stores/theme"

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    /** Breadcrumb controls declared by the route; rendered after the sidebar toggle. */
    toolbarBreadcrumbs?: ComponentType[]
    /** Center controls declared by the route; rendered beside the palette trigger. */
    toolbarCenter?: ComponentType[]
    /** Toolbar action controls declared by the route; rendered in the app bar. */
    toolbarControls?: ComponentType[]
  }
}

/** Shared spring so every toolbar item glides on the same physics. */
const toolbarSpring = { type: "spring", stiffness: 500, damping: 38 } as const

/** The single app bar: trigger · command palette button · theme · route controls. */
export function AppToolbar() {
  const { theme, toggle } = useTheme()

  // Breadcrumbs accumulate down the match chain (project → section → page);
  // controls stay leaf-owned — only the deepest route's actions render.
  const matches = useMatches()
  const breadcrumbs = matches.flatMap((m) => m.staticData?.toolbarBreadcrumbs ?? [])
  const center = matches.flatMap((m) => m.staticData?.toolbarCenter ?? [])
  const controls =
    [...matches].reverse().find((m) => m.staticData?.toolbarControls)?.staticData
      ?.toolbarControls ?? []

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <SidebarTrigger aria-label="Toggle sidebar" />

      <div className="flex min-w-0 shrink-0 items-center gap-1">
        <AnimatePresence mode="popLayout" initial={false}>
          {breadcrumbs.map((Breadcrumb, i) => (
            <motion.div
              key={`${Breadcrumb.displayName ?? Breadcrumb.name}-${i}`}
              layout
              transition={toolbarSpring}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="flex min-w-0 items-center gap-1 text-muted-foreground text-sm"
            >
              {i > 0 && (
                <ChevronRight
                  className="text-muted-foreground/50 size-3.5 shrink-0"
                  aria-hidden
                />
              )}
              <Breadcrumb />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Center: palette trigger plus optional route content beside it. The
          flex layout only kicks in when a route provides center controls —
          otherwise this renders exactly as before. */}
      <motion.div
        layout
        transition={toolbarSpring}
        className={
          center.length > 0
            ? "flex max-w-xl min-w-0 flex-1 items-center gap-2"
            : "relative max-w-xl flex-1"
        }
      >
        {center.length > 0 ? (
          <>
            <div className="shrink-0">
              <CommandPaletteTrigger />
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                {center.map((Center, i) => (
                  <motion.div
                    key={`${Center.displayName ?? Center.name}-${i}`}
                    layout
                    transition={toolbarSpring}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    className="flex min-w-0 items-center"
                  >
                    <Center />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <CommandPaletteTrigger />
        )}
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
          <NotificationsBell />
        </motion.div>

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
