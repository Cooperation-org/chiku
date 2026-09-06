import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SettingsSection } from "@/components/settings/settings-section"
import { useProjectModules, useUpdateModules } from "@/lib/queries/project-settings"
import type { Project } from "@/lib/api/types"

const PROVIDERS = [
  { key: "github", label: "GitHub" },
  { key: "gitlab", label: "GitLab" },
  { key: "bitbucket", label: "Bitbucket" },
  { key: "gogs", label: "Gogs" },
] as const

type ProviderKey = (typeof PROVIDERS)[number]["key"]

export function IntegrationsSection({
  project,
  canEdit,
}: {
  project: Project
  canEdit: boolean
}) {
  const { data: modules, isPending } = useProjectModules(project.id)
  const updateModules = useUpdateModules(project.id)
  const [secrets, setSecrets] = useState<Record<string, string>>({})

  function handleSaveSecret(provider: ProviderKey) {
    const secret = (secrets[provider] ?? "").trim()
    if (!secret) {
      toast.error("Enter a secret first")
      return
    }
    updateModules.mutate(
      { [provider]: { secret } },
      {
        onSuccess: () => {
          toast.success(`${provider} secret saved`)
          setSecrets((s) => ({ ...s, [provider]: "" }))
        },
        onError: (err) =>
          toast.error(`Failed to save secret: ${err instanceof Error ? err.message : err}`),
      },
    )
  }

  if (isPending) {
    return (
      <SettingsSection title="Integrations" description="VCS webhook endpoints and secrets.">
        <p className="text-muted-foreground text-sm">Loading integrations...</p>
      </SettingsSection>
    )
  }

  return (
    <SettingsSection title="Integrations" description="VCS webhook endpoints and secrets.">
      <div className="space-y-4">
        {PROVIDERS.map((p) => {
          const entry = modules?.[p.key] as
            | { webhooks_url?: string | null; valid_origin_ips?: string[] }
            | undefined
          return (
            <div key={p.key} className="space-y-1.5">
              <Label className="text-xs font-semibold">{p.label}</Label>
              {entry?.webhooks_url && (
                <p className="text-muted-foreground truncate font-mono text-xs">
                  {entry.webhooks_url}
                </p>
              )}
              {entry?.valid_origin_ips && entry.valid_origin_ips.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  Allowed IPs: {entry.valid_origin_ips.join(", ")}
                </p>
              )}
              {canEdit && (
                <div className="flex gap-2">
                  <Input
                    value={secrets[p.key] ?? ""}
                    onChange={(e) => setSecrets((s) => ({ ...s, [p.key]: e.target.value }))}
                    placeholder="New secret"
                    type="password"
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleSaveSecret(p.key)}
                    disabled={!(secrets[p.key] ?? "").trim() || updateModules.isPending}
                  >
                    {updateModules.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </SettingsSection>
  )
}
