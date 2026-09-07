import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SettingsSection } from "@/components/settings/settings-section"
import { useUpdateProject } from "@/lib/queries/projects"
import { firstIssue, generalSchema } from "@/lib/schemas/settings"
import type { Project } from "@/lib/api/types"

export function GeneralSection({ project, canEdit }: { project: Project; canEdit: boolean }) {
  const updateProject = useUpdateProject()
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? "")
  const dirty =
    name.trim() !== (project.name ?? "") || description.trim() !== (project.description ?? "")

  function handleSave() {
    const parsed = generalSchema.safeParse({ name, description })
    if (!parsed.success) {
      toast.error(firstIssue(parsed.error))
      return
    }
    updateProject.mutate(
      {
        id: project.id,
        data: { name: parsed.data.name, description: parsed.data.description || parsed.data.name },
      },
      {
        onSuccess: () => toast.success("Project details saved"),
        onError: (err) =>
          toast.error(`Failed to save project: ${err instanceof Error ? err.message : err}`),
      },
    )
  }

  return (
    <SettingsSection title="General" description="Name and description shown across the app.">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="settings-name" className="text-xs">
            Name
          </Label>
          <Input
            id="settings-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settings-desc" className="text-xs">
            Description
          </Label>
          <Textarea
            id="settings-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="resize-none"
            disabled={!canEdit}
          />
        </div>
        <div className="text-muted-foreground text-xs">
          Slug <span className="font-mono">{project.slug}</span> ·{" "}
          {project.is_private ? "Private" : "Public"} project
        </div>
        {canEdit && (
          <Button onClick={handleSave} disabled={!dirty || updateProject.isPending}>
            {updateProject.isPending ? "Saving..." : "Save changes"}
          </Button>
        )}
      </div>
    </SettingsSection>
  )
}
