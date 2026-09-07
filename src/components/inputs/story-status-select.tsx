import { useQuery } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import { getUserStoryStatuses } from "@/lib/api/userstories"
import { OptionsSelect, type SelectOption } from "@/components/inputs/options-select"

interface StoryStatusSelectProps {
  projectId: number
  /** Status id, or null for nothing selected. */
  value: number | null
  onValueChange: (statusId: number) => void
  /** Adds a "none" escape hatch (e.g. clearing a filter). */
  includeNone?: boolean
  noneLabel?: string
  /** Open the list on mount (inline-edit flows). */
  defaultOpen?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
  triggerClassName?: string
  ariaLabel?: string
}

/**
 * Story status (a.k.a. board column) picker. Statuses differ per project, so
 * the query key carries the project id and the list is sorted by order.
 */
export function StoryStatusSelect({
  projectId,
  value,
  onValueChange,
  includeNone = false,
  noneLabel = "No status",
  defaultOpen,
  disabled,  placeholder = "Status",
  className,
  triggerClassName,
  ariaLabel = "Status",
}: StoryStatusSelectProps) {
  const { data: statuses = [], isPending, isError, refetch } = useQuery({
    queryKey: qk.statuses(projectId),
    queryFn: () => getUserStoryStatuses(projectId),
  })

  const options: SelectOption[] = [...statuses]
    .sort((a, b) => a.order - b.order)
    .map((status) => ({
      value: String(status.id),
      label: status.name,
      dotColor: status.color || undefined,
    }))
  if (includeNone) {
    options.unshift({ value: "none", label: noneLabel })
  }

  const selectValue = value !== null ? String(value) : includeNone ? "none" : null

  return (
    <OptionsSelect
      options={options}
      value={selectValue}
      onValueChange={(v) => {
        if (v !== "none") onValueChange(Number(v))
      }}
      defaultOpen={defaultOpen}
      isLoading={isPending}
      isError={isError}
      onRetry={refetch}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      triggerClassName={triggerClassName}
      ariaLabel={ariaLabel}
    />
  )
}
