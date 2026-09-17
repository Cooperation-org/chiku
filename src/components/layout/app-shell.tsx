import { useParams } from "@tanstack/react-router"
import { CohortNav } from "@/components/app/cohort-nav"
import { ShortcutsHelpDialog } from "@/components/app/shortcut-help-dialog"
import { ProjectHoldPicker } from "@/components/app/project-hold-picker"
import { AppToolbar } from "@/components/layout/app-toolbar"
import { AppHotkeys } from "@/components/layout/hotkeys"
import { CommandPalette } from "@/components/layout/command-palette"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { DragDropProvider } from "@dnd-kit/react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { boardDragSensors } from "@/lib/dnd/board-dnd"
import { useSidebarStore } from "@/lib/stores/sidebar"
import { useProjectStore } from "@/lib/stores/project"

/**
 * The application chrome, built on the shadcn sidebar primitives:
 * the (untouchable) cohort top bar stays at the very top; below it the
 * sidebar (collapsible="icon") and the content pane share the remaining
 * fixed height — the page itself never scrolls.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const expanded = useSidebarStore((s) => s.expanded)
  const setExpanded = useSidebarStore((s) => s.setExpanded)
  const selectedSlug = useProjectStore((s) => s.selectedSlug)

  const params = useParams({ strict: false })
  const urlSlug = (params as { slug?: string }).slug ?? null
  const org = urlSlug ?? selectedSlug

  return (
    <AppHotkeys>
      <TooltipProvider>
        {/* Single drag session for the app lifetime: board cards/columns and
            the toolbar sprint rail share this manager via hooks. Owned here
            so route changes (which mount/unmount pages) can never destroy
            it mid-use. */}
        <DragDropProvider sensors={boardDragSensors}>
        <div className="flex h-dvh flex-col overflow-hidden">
          {/* The cohort top bar is a static background element — never modified. */}
          <CohortNav org={org} />

          <SidebarProvider open={expanded} onOpenChange={setExpanded} className="min-h-0 flex-1">
            <AppSidebar />
            <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
              <AppToolbar />
              <main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
            </SidebarInset>
          </SidebarProvider>

          <CommandPalette />
          <ProjectHoldPicker />
          <ShortcutsHelpDialog />
        </div>
        </DragDropProvider>
      </TooltipProvider>
    </AppHotkeys>
  )
}
