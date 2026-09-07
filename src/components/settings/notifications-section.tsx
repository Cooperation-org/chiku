import { toast } from "sonner"
import { SettingsSection } from "@/components/settings/settings-section"
import { OptionsSelect } from "@/components/inputs/options-select"
import { useNotifyPolicy, useUpdateNotifyPolicy } from "@/lib/queries/project-settings"
import { notifyLevelSchema } from "@/lib/schemas/settings"
import type { Project } from "@/lib/api/types"

const LEVEL_OPTIONS = [
  { value: "0", label: "Involved — only things involving me" },
  { value: "1", label: "All activity — every project event" },
  { value: "2", label: "None — mute project emails" },
]

export function NotificationsSection({
  project,
  canEdit,
}: {
  project: Project
  canEdit: boolean
}) {
  const { policy, isPending, isError, refetch } = useNotifyPolicy(project.id)
  const updatePolicy = useUpdateNotifyPolicy()

  // Seed from the project payload when the policies list hasn't loaded yet.
  const current =
    policy != null ? String(policy.notify_level) : (project.notify_level ?? null) != null ? String(project.notify_level) : null

  function handleChange(value: string) {
    const parsed = notifyLevelSchema.safeParse({ notify_level: Number(value) })
    if (!parsed.success) {
      toast.error("Invalid notification level")
      return
    }
    if (policy == null) {
      toast.error("Notification policy isn't available for this project yet")
      return
    }
    updatePolicy.mutate(
      { id: policy.id, notify_level: parsed.data.notify_level },
      {
        onSuccess: () => toast.success("Notification level saved"),
        onError: (err) =>
          toast.error(`Failed to save notifications: ${err instanceof Error ? err.message : err}`),
      },
    )
  }

  return (
    <SettingsSection title="Notifications" description="How much project email you receive.">
      <OptionsSelect
        options={LEVEL_OPTIONS}
        value={current}
        onValueChange={handleChange}
        isLoading={isPending}
        isError={isError}
        onRetry={refetch}
        disabled={!canEdit || updatePolicy.isPending || policy == null}
        placeholder="Notification level"
        ariaLabel="Notification level"
      />
      {policy == null && !isPending && (
        <p className="text-muted-foreground mt-2 text-xs">
          No notification policy found for this project.
        </p>
      )}
    </SettingsSection>
  )
}
