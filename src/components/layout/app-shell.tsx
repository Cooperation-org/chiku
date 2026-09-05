import { useParams } from "@tanstack/react-router"
import { Menu } from "lucide-react"
import { CohortNav } from "@/components/app/cohort-nav"
import { SuperSidebar } from "@/components/sidebar/super-sidebar"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useSidebarStore } from "@/lib/stores/sidebar"
import { useProjectStore } from "@/lib/stores/project"

/**
 * The application chrome: the (untouchable) cohort top bar stays at the very
 * top; on desktop the super sidebar + content share the remaining fixed
 * height. A slim mobile-only bar carries the sidebar hamburger.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = useSidebarStore((s) => s.collapsed)
  const mobileOpen = useSidebarStore((s) => s.mobileOpen)
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen)
  const selectedSlug = useProjectStore((s) => s.selectedSlug)

  const params = useParams({ strict: false })
  const urlSlug = (params as { slug?: string }).slug ?? null
  const org = urlSlug ?? selectedSlug

  return (
    <TooltipProvider>
      <div className="flex h-dvh flex-col overflow-hidden">
        {/* The cohort top bar is a static background element — never modified. */}
        <CohortNav org={org} />

        {/* Mobile-only utility bar: the hamburger for the sidebar */}
        <div className="bg-background/95 flex h-9 shrink-0 items-center border-b px-2 md:hidden">
          <button
            className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1.5 transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Desktop sidebar — icon rail when collapsed */}
          <aside
            className={`bg-sidebar text-sidebar-foreground hidden shrink-0 border-r transition-[width] duration-200 md:block ${
              collapsed ? "w-14" : "w-60"
            }`}
          >
            <SuperSidebar collapsed={collapsed} onNavigate={() => {}} />
          </aside>

          {/* Mobile sidebar — overlay sheet */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="bg-sidebar w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SuperSidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  )
}
