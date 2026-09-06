import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SettingsSection } from "@/components/settings/settings-section"
import {
  getExportDump,
  useCreateTemplate,
  useDuplicateProject,
  useProjectTemplates,
} from "@/lib/queries/project-settings"
import { api } from "@/lib/api/client"
import { duplicateSchema, firstIssue, templateSchema } from "@/lib/schemas/settings"
import type { Project } from "@/lib/api/types"

export function DataSection({ project, canEdit }: { project: Project; canEdit: boolean }) {
  const navigate = useNavigate()
  const { data: templates = [] } = useProjectTemplates(canEdit)
  const [exporting, setExporting] = useState(false)
  const [showDuplicate, setShowDuplicate] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const result = await getExportDump(project.id)
      if ("url" in result) {
        const blob = await api.getBlob(result.url)
        const href = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = href
        a.download = `${project.slug}-export.json`
        a.click()
        URL.revokeObjectURL(href)
        toast.success("Backup downloaded")
      } else {
        toast.success(`Export queued (${result.export_id}) — check back shortly`)
      }
    } catch (err) {
      toast.error(`Failed to export: ${err instanceof Error ? err.message : err}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <SettingsSection title="Data" description="Back up, copy, or templatize this project.">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? "Exporting..." : "Download backup"}
        </Button>
        {canEdit && (
          <>
            <Button variant="outline" size="sm" onClick={() => setShowDuplicate(true)}>
              Duplicate project
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowTemplate(true)}>
              Save as template
            </Button>
          </>
        )}
      </div>
      {templates.length > 0 && (
        <p className="text-muted-foreground mt-2 text-xs">
          {templates.length} project template{templates.length === 1 ? "" : "s"} available when
          creating new projects.
        </p>
      )}
      {showDuplicate && (
        <DuplicateDialog
          project={project}
          onClose={() => setShowDuplicate(false)}
          onCreated={(slug) => {
            setShowDuplicate(false)
            navigate({ to: "/projects/$slug/board", params: { slug } })
          }}
        />
      )}
      {showTemplate && <TemplateDialog projectId={project.id} onClose={() => setShowTemplate(false)} />}
    </SettingsSection>
  )
}

function DuplicateDialog({
  project,
  onClose,
  onCreated,
}: {
  project: Project
  onClose: () => void
  onCreated: (slug: string) => void
}) {
  const duplicate = useDuplicateProject()
  const [name, setName] = useState(`${project.name} (copy)`)
  const [description, setDescription] = useState(project.description ?? "")
  const [isPrivate, setIsPrivate] = useState(project.is_private)

  function handleDuplicate() {
    const parsed = duplicateSchema.safeParse({ name, description, is_private: isPrivate })
    if (!parsed.success) {
      toast.error(firstIssue(parsed.error))
      return
    }
    duplicate.mutate(
      { projectId: project.id, data: parsed.data },
      {
        onSuccess: (created) => {
          toast.success(`Duplicated as ${created.name}`)
          onCreated(created.slug)
        },
        onError: (err) =>
          toast.error(`Failed to duplicate: ${err instanceof Error ? err.message : err}`),
      },
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicate project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dup-name">Name</Label>
            <Input id="dup-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dup-desc">Description</Label>
            <Textarea
              id="dup-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={isPrivate} onCheckedChange={(v) => setIsPrivate(v === true)} />
            Private copy
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={duplicate.isPending || !name.trim()}>
            {duplicate.isPending ? "Duplicating..." : "Duplicate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TemplateDialog({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const createTemplate = useCreateTemplate()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  function handleSave() {
    const parsed = templateSchema.safeParse({ template_name: name, template_description: description })
    if (!parsed.success) {
      toast.error(firstIssue(parsed.error))
      return
    }
    createTemplate.mutate(
      { projectId, data: parsed.data },
      {
        onSuccess: () => {
          toast.success("Template saved")
          onClose()
        },
        onError: (err) =>
          toast.error(`Failed to save template: ${err instanceof Error ? err.message : err}`),
      },
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save as template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Template name</Label>
            <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-desc">Description</Label>
            <Textarea
              id="tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={createTemplate.isPending || !name.trim()}>
            {createTemplate.isPending ? "Saving..." : "Save template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
