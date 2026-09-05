import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string
  label: string
  /** Statuses carry a color — rendered as a dot in the trigger and the list. */
  dotColor?: string
}

interface OptionsSelectProps {
  options: SelectOption[]
  value: string | null
  onValueChange: (value: string) => void
  /** Shown on the closed trigger when nothing is selected. */
  placeholder?: string
  /** Open the list as soon as the control mounts (inline-edit flows). */
  defaultOpen?: boolean
  isLoading?: boolean
  isError?: boolean
  /** Clicking a failed select re-fetches (event-driven, no effects). */
  onRetry?: () => void
  disabled?: boolean
  className?: string
  triggerClassName?: string
  ariaLabel?: string
}

/**
 * The one select primitive every backend-driven dropdown is built on:
 * resolves value → label from `options` (never shows raw ids), renders a
 * colored dot for statuses, and owns the loading/error trigger states.
 */
export function OptionsSelect({
  options,
  value,
  onValueChange,
  placeholder,
  defaultOpen,
  isLoading = false,
  isError = false,
  onRetry,
  disabled = false,
  className,
  triggerClassName,
  ariaLabel,
}: OptionsSelectProps) {
  const selected = value !== null ? options.find((o) => o.value === value) : undefined
  const unusable = isLoading || isError

  return (
    <Select
      value={value}
      defaultOpen={defaultOpen}
      onValueChange={(v) => {
        if (v !== null) onValueChange(v)
      }}
      onOpenChange={(open) => {
        if (open && isError) onRetry?.()
      }}
      disabled={disabled || unusable}
    >
      <SelectTrigger className={cn("w-full", triggerClassName)} aria-label={ariaLabel}>
        {isLoading ? (
          <span className="text-muted-foreground text-sm">Loading…</span>
        ) : isError ? (
          <span className="text-destructive text-sm">Couldn't load — retry</span>
        ) : selected ? (
          <span className="flex min-w-0 items-center gap-2">
            {selected.dotColor && (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: selected.dotColor }}
                aria-hidden
              />
            )}
            <span className="truncate">{selected.label}</span>
          </span>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent className={className}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex items-center gap-2">
              {option.dotColor && (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: option.dotColor }}
                  aria-hidden
                />
              )}
              {option.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
