import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SearchFieldProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  /** Show the "/" key hint (visual only — hotkey wiring comes later). */
  showHint?: boolean
}

/**
 * GitLab-style search field. Presentational by design: commands and keyboard
 * shortcuts are wired separately.
 */
export function SearchField({ value, onChange, placeholder = "Search or go to…", className, showHint = true }: SearchFieldProps) {
  return (
    <div
      className={cn(
        "bg-background hover:border-ring/40 focus-within:border-ring/60 flex h-9 w-full max-w-xl items-center gap-2 rounded-lg border px-3 transition-colors",
        className
      )}
    >
      <Search className="text-muted-foreground h-4 w-4 shrink-0" />
      <Input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 focus-visible:border-0"
      />
      {showHint && (
        <kbd className="text-muted-foreground pointer-events-none hidden shrink-0 rounded border px-1.5 py-0.5 text-[10px] md:block">
          /
        </kbd>
      )}
    </div>
  )
}
