import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SettingsSection } from "@/components/settings/settings-section"
import { useUpdateProject } from "@/lib/queries/projects"
import { buildProjectUnitTags, getProjectUnits, hasCustomUnits } from "@/lib/project-units"
import { firstIssue, valueUnitsSchema } from "@/lib/schemas/settings"
import { DEFAULT_CASH_UNIT, DEFAULT_TEAM_UNIT } from "@/lib/values"
import type { Project } from "@/lib/api/types"

/**
 * Per-venture pie-slicing units. Stored as shared project tags
 * (`value-team:slices`, `value-cash:eur`) so every member — plus GovKit's
 * sync and `mcp-taiga` (`TAG_TEAM` / `TAG_CASH`) — reads the same units.
 * A venture with nothing set defaults to cook / usd.
 */
export function ValueUnitsSection({ project, canEdit }: { project: Project; canEdit: boolean }) {
  const updateProject = useUpdateProject()
  const effective = getProjectUnits(project)
  const custom = hasCustomUnits(project)
  const [team, setTeam] = useState(effective.team)
  const [cash, setCash] = useState(effective.cash)
  const dirty =
    team.trim().toLowerCase() !== effective.team || cash.trim().toLowerCase() !== effective.cash

  function handleSave() {
    const parsed = valueUnitsSchema.safeParse({ team, cash })
    if (!parsed.success) {
      toast.error(firstIssue(parsed.error))
      return
    }
    updateProject.mutate(
      {
        id: project.id,
        data: { tags: buildProjectUnitTags(project.tags, parsed.data) },
      },
      {
        onSuccess: () => toast.success("Value units saved"),
        onError: (err) =>
          toast.error(`Failed to save units: ${err instanceof Error ? err.message : err}`),
      },
    )
  }

  function handleReset() {
    setTeam(DEFAULT_TEAM_UNIT)
    setCash(DEFAULT_CASH_UNIT)
  }

  const teamPreview = team.trim().toLowerCase() || effective.team
  const cashPreview = cash.trim().toLowerCase() || effective.cash

  return (
    <SettingsSection
      title="Value units"
      description="Team and cash units for pie-slicing value tags on stories. Shared across the venture."
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="settings-team-unit" className="text-xs">
              Team unit
            </Label>
            <Input
              id="settings-team-unit"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              disabled={!canEdit}
              placeholder={DEFAULT_TEAM_UNIT}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-cash-unit" className="text-xs">
              Cash unit
            </Label>
            <Input
              id="settings-cash-unit"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              disabled={!canEdit}
              placeholder={DEFAULT_CASH_UNIT}
            />
          </div>
        </div>
        <div className="text-muted-foreground text-xs">
          {custom ? (
            <>
              Currently <span className="font-mono">value-team:{effective.team}</span> ·{" "}
              <span className="font-mono">value-cash:{effective.cash}</span> — stories read{" "}
              <span className="font-mono">30{teamPreview}</span> +{" "}
              <span className="font-mono">100{cashPreview}</span>.
            </>
          ) : (
            <>
              Nothing set — using defaults <span className="font-mono">cook</span> /{" "}
              <span className="font-mono">usd</span> (stories read{" "}
              <span className="font-mono">50cook</span> + <span className="font-mono">100usd</span>).
            </>
          )}{" "}
          Story tags keep the <span className="font-mono">{"{number}{unit}"}</span> shape, so
          GovKit and <span className="font-mono">mcp-taiga</span> keep working unchanged.
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!dirty || updateProject.isPending}>
              {updateProject.isPending ? "Saving..." : "Save units"}
            </Button>
            {custom && (
              <Button variant="outline" onClick={handleReset} disabled={updateProject.isPending}>
                Reset to defaults
              </Button>
            )}
          </div>
        )}
      </div>
    </SettingsSection>
  )
}
