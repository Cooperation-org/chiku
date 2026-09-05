import { ChevronRight } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useSidebarStore } from "@/lib/stores/sidebar"

interface SidebarSectionProps {
  /** Persistent open/closed key in the sidebar store. */
  id: string
  icon?: React.ReactNode
  label: string
  children: React.ReactNode
  /** Hide entirely (icon rail mode is handled by the caller). */
  className?: string
}

export function SidebarSection({ id, icon, label, children, className = "" }: SidebarSectionProps) {
  const open = useSidebarStore((s) => s.sections[id] ?? true)
  const toggleSection = useSidebarStore((s) => s.toggleSection)

  return (
    <Collapsible open={open} onOpenChange={() => toggleSection(id)} className={className}>
      <CollapsibleTrigger className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground mb-0.5 flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm transition-colors">
        {icon && (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
        )}
        <span className="flex-1 truncate text-left font-medium">{label}</span>
        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-3 space-y-0.5 border-l pl-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}
