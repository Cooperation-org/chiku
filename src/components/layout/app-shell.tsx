import { useParams } from "@tanstack/react-router"
import { CohortNav } from "@/components/app/cohort-nav"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
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
    <TooltipProvider>
      <div className="flex h-dvh flex-col overflow-hidden">
        {/* The cohort top bar is a static background element — never modified. */}
        <CohortNav org={org} />

        <SidebarProvider open={expanded} onOpenChange={setExpanded} className="min-h-0 flex-1">
          <AppSidebar />
          <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
            {/* Mobile-only utility bar: the hamburger opens the sidebar sheet */}
            <div className="bg-background/95 flex h-9 shrink-0 items-center border-b px-2 md:hidden">
              <SidebarTrigger aria-label="Open navigation menu" />
            </div>
            <main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </TooltipProvider>
  )
}
