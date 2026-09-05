import { pointChoices } from "@/lib/api/points"
import { OptionsSelect, type SelectOption } from "@/components/inputs/options-select"
import type { Project } from "@/lib/api/types"

interface PointsSelectProps {
  /** The story's project — the point catalog lives on it. */
  project: Project
  /** Point id, or null for no estimate. */
  value: number | null
  onValueChange: (pointId: number | null) => void
  /** Open the list on mount (inline-edit flows). */
  defaultOpen?: boolean
  disabled?: boolean
  placeholder?: string
  noneLabel?: string
  className?: string
  triggerClassName?: string
  ariaLabel?: string
}

/** Estimate picker — the choices come from the project's point catalog. */
export function PointsSelect({
  project,
  value,
  onValueChange,
  defaultOpen,
  disabled,
  placeholder = "No estimate",
  noneLabel = "No estimate",
  className,
  triggerClassName,
  ariaLabel = "Estimate",
}: PointsSelectProps) {
  const options: SelectOption[] = [
    { value: "none", label: noneLabel },
    ...pointChoices(project)
      .filter((p) => p.value !== null)
      .map((p) => ({ value: String(p.id), label: `${p.name} points` })),
  ]

  return (
    <OptionsSelect
      options={options}
      value={value === null ? "none" : String(value)}
      onValueChange={(v) => onValueChange(v === "none" ? null : Number(v))}
      defaultOpen={defaultOpen}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      triggerClassName={triggerClassName}
      ariaLabel={ariaLabel}
    />
  )
}
