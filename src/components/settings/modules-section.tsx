import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { SettingsSection } from "@/components/settings/settings-section"
import { useUpdateProject } from "@/lib/queries/projects"
import type { Project } from "@/lib/api/types"

const MODULE_ROWS = [
  { key: "is_kanban_activated", label: "Board", hint: "Kanban view" },
  { key: "is_backlog_activated", label: "Backlog", hint: "Backlog + sprints" },
  { key: "is_epics_activated", label: "Epics", hint: "Epic planning" },
  { key: "is_issues_activated", label: "Issues", hint: "Issue tracking" },
  { key: "is_wiki_activated", label: "Wiki", hint: "Documentation pages" },
  { key: "is_contact_activated", label: "Contact form", hint: "Let outsiders contact admins" },
] as const

type ModuleKey = (typeof MODULE_ROWS)[number]["key"]

export function ModulesSection({ project, canEdit }: { project: Project; canEdit: boolean }) {
  const updateProject = useUpdateProject()

  function toggle(key: ModuleKey, checked: boolean) {
    updateProject.mutate(
      { id: project.id, data: { [key]: checked } },
      {
        onSuccess: () => toast.success("Module setting saved"),
        onError: (err) =>
          toast.error(`Failed to update module: ${err instanceof Error ? err.message : err}`),
      },
    )
  }

  function togglePrivacy(checked: boolean) {
    updateProject.mutate(
      { id: project.id, data: { is_private: checked } },
      {
        onSuccess: () => toast.success(checked ? "Project is now private" : "Project is now public"),
        onError: (err) =>
          toast.error(`Failed to update visibility: ${err instanceof Error ? err.message : err}`),
      },
    )
  }

  return (
    <SettingsSection title="Modules & visibility" description="Toggling a module shows or hides its sidebar view.">
      <div className="space-y-2">
        {MODULE_ROWS.map((row) => (
          <label key={row.key} className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 hover:bg-accent/50">
            <Checkbox
              checked={(project[row.key] ?? false) === true}
              onCheckedChange={(v) => toggle(row.key, v === true)}
              disabled={!canEdit || updateProject.isPending}
            />
            <span className="min-w-24 text-sm font-medium">{row.label}</span>
            <span className="text-muted-foreground text-xs">{row.hint}</span>
          </label>
        ))}
        <div className="border-t pt-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 hover:bg-accent/50">
            <Checkbox
              checked={project.is_private}
              onCheckedChange={(v) => togglePrivacy(v === true)}
              disabled={!canEdit || updateProject.isPending}
            />
            <span className="min-w-24 text-sm font-medium">Private</span>
            <span className="text-muted-foreground text-xs">
              Only members can see a private project
            </span>
          </label>
        </div>
      </div>
    </SettingsSection>
  )
}
