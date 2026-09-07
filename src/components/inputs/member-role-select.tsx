import { useQuery } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import { getProjectRoles, type Role } from "@/lib/api/memberships"
import { OptionsSelect, type SelectOption } from "@/components/inputs/options-select"

interface MemberRoleSelectProps {
  projectId: number
  /** Role id as a string, or "" for nothing selected. */
  value: string
  onValueChange: (roleId: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  triggerClassName?: string
}

/** Role picker for a project — roles are backend data, never static. */
export function MemberRoleSelect({
  projectId,
  value,
  onValueChange,
  disabled,
  placeholder = "Role",
  className,
  triggerClassName,
}: MemberRoleSelectProps) {
  const query = useQuery({
    queryKey: [...qk.memberships(projectId), "roles"],
    queryFn: () => getProjectRoles(projectId),
  })

  const options: SelectOption[] = (query.data ?? []).map((role: Role) => ({
    value: String(role.id),
    label: role.name,
  }))

  return (
    <OptionsSelect
      options={options}
      value={value || null}
      onValueChange={onValueChange}
      isLoading={query.isPending}
      isError={query.isError}
      onRetry={query.refetch}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      triggerClassName={triggerClassName}
      ariaLabel="Role"
    />
  )
}
