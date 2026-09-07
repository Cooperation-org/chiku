import { useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/app/avatar"
import { SettingsSection } from "@/components/settings/settings-section"
import { useChangeLogo, useRemoveLogo } from "@/lib/queries/project-settings"
import type { Project } from "@/lib/api/types"

export function BrandSection({ project, canEdit }: { project: Project; canEdit: boolean }) {
  const changeLogo = useChangeLogo()
  const removeLogo = useRemoveLogo()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  function handlePick(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file")
      return
    }
    setPreview(URL.createObjectURL(file))
    changeLogo.mutate(
      { projectId: project.id, file },
      {
        onSuccess: () => {
          toast.success("Logo updated")
          setPreview(null)
        },
        onError: (err) => {
          toast.error(`Failed to upload logo: ${err instanceof Error ? err.message : err}`)
          setPreview(null)
        },
      },
    )
  }

  function handleRemove() {
    removeLogo.mutate(project.id, {
      onSuccess: () => toast.success("Logo removed"),
      onError: (err) =>
        toast.error(`Failed to remove logo: ${err instanceof Error ? err.message : err}`),
    })
  }

  const busy = changeLogo.isPending || removeLogo.isPending
  const logo = preview ?? project.logo_small_url ?? project.logo_big_url ?? null

  return (
    <SettingsSection title="Brand" description="Project logo shown in the switcher and headers.">
      <div className="flex items-center gap-4">
        <Avatar name={project.name} variant="marble" size="sm" photo={logo} className="text-white" />
        {canEdit && (
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePick(e.target.files?.[0])}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
              {changeLogo.isPending ? "Uploading..." : "Upload logo"}
            </Button>
            {project.logo_small_url && (
              <Button variant="ghost" size="sm" onClick={handleRemove} disabled={busy}>
                {removeLogo.isPending ? "Removing..." : "Remove"}
              </Button>
            )}
          </div>
        )}
      </div>
    </SettingsSection>
  )
}
