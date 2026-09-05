import { useEffect, useRef, useState } from "react"
import { initialsFor } from "@/lib/utils/initials"
import { changeAvatar, getMe, removeAvatar, updateMe, MAX_DISPLAY_NAME, type Me } from "@/lib/api/users"
import { Avatar } from "@/components/app/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Taiga gives each user one of these; they are the avatar background.
const presetColors = [
  "#40A8E5", "#54D1DB", "#70CF97", "#FFC66D",
  "#FF9F43", "#F57D7D", "#C49ADE", "#D917A3",
]

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (me: Me) => void
}

export function ProfileDialog({ open, onOpenChange, onUpdated }: ProfileDialogProps) {
  const [me, setMe] = useState<Me | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [color, setColor] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const preview = initialsFor(displayName || me?.username)
  const dirty = !!me && (displayName.trim() !== me.full_name || color !== me.color)

  useEffect(() => {
    if (!open) return
    setIsLoading(true)
    setError("")
    getMe()
      .then((loaded) => {
        setMe(loaded)
        setDisplayName(loaded.full_name)
        setColor(loaded.color)
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setIsLoading(false))
  }, [open])

  function applyUser(updated: Me) {
    setMe(updated)
    setDisplayName(updated.full_name)
    setColor(updated.color)
    setSaved(true)
    onUpdated(updated)
  }

  async function save() {
    if (!me || saving) return
    setSaving(true)
    setError("")
    try {
      applyUser(await updateMe(me.id, { full_name: displayName.trim(), color }))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError("")
    try {
      applyUser(await changeAvatar(file))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  async function dropPicture() {
    setUploading(true)
    setError("")
    try {
      applyUser(await removeAvatar())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Your profile</DialogTitle>
          <p className="text-muted-foreground text-sm">How your name and icon appear on every card</p>
        </DialogHeader>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : !me ? (
          <div className="p-8 text-center text-destructive">{error || "Could not load your profile"}</div>
        ) : (
          <>
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar name={displayName || me.username} photo={me.photo} color={color} size="xl" className="text-white" />
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
                      {uploading ? "..." : me.photo ? "Replace picture" : "Upload a picture"}
                    </Button>
                    {me.photo && (
                      <Button variant="ghost" size="sm" onClick={dropPicture} disabled={uploading} className="text-muted-foreground">
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {me.photo
                      ? "Remove the picture to go back to letters."
                      : (
                        <>
                          With no picture, the icon is <span className="font-medium">{preview}</span> — the first letters of your display name.
                        </>
                      )}
                  </p>
                </div>
                <input type="file" accept="image/*" ref={fileInput} onChange={onFile} className="hidden" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-display-name">Display name</Label>
                <Input
                  id="profile-display-name"
                  value={displayName}
                  maxLength={MAX_DISPLAY_NAME}
                  placeholder={me.username}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Two words give two letters: "Jefferson Richards" shows as JR.
                </p>
              </div>

              <div>
                <span className="mb-2 block text-sm font-medium">Icon colour</span>
                <div className="flex flex-wrap gap-2">
                  {presetColors.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setColor(preset)}
                      className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                        color?.toLowerCase() === preset.toLowerCase() ? "border-foreground" : "border-transparent"
                      }`}
                      style={{ backgroundColor: preset }}
                      title={preset}
                      aria-label={`Use ${preset}`}
                    />
                  ))}
                </div>
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-4">
              {saved && !dirty && <span className="text-muted-foreground mr-auto text-sm">Saved</span>}
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={save} disabled={saving || !dirty}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
