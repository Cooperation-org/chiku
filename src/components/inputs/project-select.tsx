import { useProjects } from "@/lib/queries/projects"
import { isArchived } from "@/lib/api/projects"
import { OptionsSelect, type SelectOption } from "@/components/inputs/options-select"

interface ProjectSelectProps {
  /** Which field of the project the value carries. */
  valueKey?: "id" | "slug"
  value: string | null
  onValueChange: (value: string) => void
  includeArchived?: boolean
  /** Adds an escape-hatch option (e.g. "All projects", "Default columns"). */
  includeNone?: boolean
  noneLabel?: string
  disabled?: boolean
  placeholder?: string
  className?: string
  triggerClassName?: string
  ariaLabel?: string
}

/** Project picker — projects come from the backend. */
export function ProjectSelect({
  valueKey = "id",
  value,
  onValueChange,
  includeArchived = false,
  includeNone = false,
  noneLabel = "None",
  disabled,
  placeholder = "Select project",
  className,
  triggerClassName,
  ariaLabel = "Project",
}: ProjectSelectProps) {
  const { data: projects, isPending, isError, refetch } = useProjects()

  const pool = includeArchived ? (projects ?? []) : (projects ?? []).filter((p) => !isArchived(p))
  const options: SelectOption[] = pool.map((p) => ({
    value: valueKey === "slug" ? p.slug : String(p.id),
    label: isArchived(p) ? `${p.name} (archived)` : p.name,
  }))
  if (includeNone) {
    options.unshift({ value: "none", label: noneLabel })
  }

  return (
    <OptionsSelect
      options={options}
      value={value ?? (includeNone ? "none" : null)}
      onValueChange={onValueChange}
      isLoading={isPending}
      isError={isError}
      onRetry={() => void refetch()}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      triggerClassName={triggerClassName}
      ariaLabel={ariaLabel}
    />
  )
}
