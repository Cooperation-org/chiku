import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface SidebarItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  disabled?: boolean
  /** Icon-rail mode: icon only, label in a tooltip. */
  collapsed?: boolean
  onClick: () => void
}

export function SidebarItem({ icon, label, active, disabled, collapsed, onClick }: SidebarItemProps) {
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={onClick}
              disabled={disabled}
              aria-label={label}
              className={`text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground flex h-8 w-full items-center justify-center rounded-md transition-colors disabled:opacity-50 ${
                active ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
              }`}
            />
          }
        >
          {icon}
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm transition-colors ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      }`}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  )
}
