import { useQuery } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import { getProjectMemberships, type Membership } from "@/lib/api/memberships"
import { OptionsSelect, type SelectOption } from "@/components/inputs/options-select"

interface AssigneeSelectProps {
  projectId: number
  /** Taiga user id, or null for unassigned. */
  value: number | null
  onValueChange: (userId: number | null) => void
  /** Open the list on mount (inline-edit flows). */
  defaultOpen?: boolean
  disabled?: boolean
  placeholder?: string
  unassignedLabel?: string
  className?: string
  triggerClassName?: string
  ariaLabel?: string
}

/** Project member picker (assignee). Members come from the backend. */
export function AssigneeSelect({
  projectId,
  value,
  onValueChange,
  defaultOpen,
  disabled,  placeholder = "Assignee",
  unassignedLabel = "Unassigned",
  className,
  triggerClassName,
  ariaLabel = "Assignee",
}: AssigneeSelectProps) {
  const { data: memberships = [], isPending, isError, refetch } = useQuery({
    queryKey: qk.memberships(projectId),
    queryFn: () => getProjectMemberships(projectId),
  })

  const options: SelectOption[] = [
    { value: "unassigned", label: unassignedLabel },
    ...memberships.map((m: Membership) => ({
      value: String(m.user),
      label: m.full_name || `user ${m.user}`,
    })),
  ]

  const selectValue = value === null ? "unassigned" : String(value)

  return (
    <OptionsSelect
      options={options}
      value={selectValue}
      onValueChange={(v) => onValueChange(v === "unassigned" ? null : Number(v))}
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
