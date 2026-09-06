import { useState } from "react"
import { toast } from "sonner"
import { FlaskConical, History, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SettingsSection } from "@/components/settings/settings-section"
import {
  useCreateWebhook,
  useDeleteWebhook,
  useResendLog,
  useTestWebhook,
  useUpdateWebhook,
  useWebhookLogs,
  useWebhooks,
} from "@/lib/queries/project-settings"
import { firstIssue, webhookSchema } from "@/lib/schemas/settings"
import type { Project, Webhook } from "@/lib/api/types"

export function WebhooksSection({ project, canEdit }: { project: Project; canEdit: boolean }) {
  const { data: webhooks = [], isPending } = useWebhooks(project.id)
  const deleteWebhook = useDeleteWebhook(project.id)
  const testWebhook = useTestWebhook()
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Webhook | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  function handleDelete(id: number) {
    deleteWebhook.mutate(id, {
      onSuccess: () => toast.success("Webhook deleted"),
      onError: (err) =>
        toast.error(`Failed to delete webhook: ${err instanceof Error ? err.message : err}`),
    })
  }

  function handleTest(id: number) {
    testWebhook.mutate(id, {
      onSuccess: () => toast.success("Test delivery sent — see logs"),
      onError: (err) =>
        toast.error(`Failed to test webhook: ${err instanceof Error ? err.message : err}`),
    })
  }

  return (
    <SettingsSection title="Webhooks" description="POST every project event to your own service.">
      {isPending ? (
        <p className="text-muted-foreground text-sm">Loading webhooks...</p>
      ) : webhooks.length === 0 ? (
        <p className="text-muted-foreground text-sm">No webhooks yet</p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="w-20 text-right">Logs</TableHead>
                {canEdit && <TableHead className="w-40 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((w) => (
                <>
                  <TableRow key={w.id}>
                    <TableCell>
                      <button
                        className="text-left text-sm font-medium hover:underline"
                        onClick={() => {
                          setEditing(w)
                          setShowDialog(true)
                        }}
                        disabled={!canEdit}
                      >
                        {w.name}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-56 truncate font-mono text-xs">
                      {w.url}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setExpandedId((id) => (id === w.id ? null : w.id))}
                      >
                        <History className="h-3.5 w-3.5" /> {w.logs_counter}
                      </Button>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => handleTest(w.id)}
                            disabled={testWebhook.isPending}
                          >
                            <FlaskConical className="h-3.5 w-3.5" /> Test
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive h-7 px-2"
                            onClick={() => handleDelete(w.id)}
                            disabled={deleteWebhook.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  {expandedId === w.id && (
                    <TableRow key={`${w.id}-logs`}>
                      <TableCell colSpan={canEdit ? 4 : 3} className="bg-muted/40 p-2">
                        <WebhookLogs webhookId={w.id} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {canEdit && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => {
            setEditing(null)
            setShowDialog(true)
          }}
        >
          <Plus className="h-4 w-4" /> Add webhook
        </Button>
      )}
      {showDialog && (
        <WebhookDialog
          projectId={project.id}
          editing={editing}
          onClose={() => {
            setShowDialog(false)
            setEditing(null)
          }}
        />
      )}
    </SettingsSection>
  )
}

function WebhookDialog({
  projectId,
  editing,
  onClose,
}: {
  projectId: number
  editing: Webhook | null
  onClose: () => void
}) {
  const createWebhook = useCreateWebhook(projectId)
  const updateWebhook = useUpdateWebhook(projectId)
  const [name, setName] = useState(editing?.name ?? "")
  const [url, setUrl] = useState(editing?.url ?? "")
  const [key, setKey] = useState("")
  const busy = createWebhook.isPending || updateWebhook.isPending

  function handleSave() {
    const parsed = webhookSchema.safeParse({ name, url, key: editing ? key || "unchanged" : key })
    if (!parsed.success) {
      toast.error(firstIssue(parsed.error))
      return
    }
    if (editing) {
      const data: { name?: string; url?: string; key?: string } = {
        name: parsed.data.name,
        url: parsed.data.url,
      }
      if (key.trim()) data.key = key.trim()
      updateWebhook.mutate(
        { id: editing.id, data },
        {
          onSuccess: () => {
            toast.success("Webhook saved")
            onClose()
          },
          onError: (err) =>
            toast.error(`Failed to save webhook: ${err instanceof Error ? err.message : err}`),
        },
      )
    } else {
      createWebhook.mutate(
        { name: parsed.data.name, url: parsed.data.url, key: parsed.data.key },
        {
          onSuccess: () => {
            toast.success("Webhook created")
            onClose()
          },
          onError: (err) =>
            toast.error(`Failed to create webhook: ${err instanceof Error ? err.message : err}`),
        },
      )
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit webhook" : "New webhook"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="webhook-name">Name</Label>
            <Input id="webhook-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="webhook-url">Payload URL</Label>
            <Input
              id="webhook-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="webhook-key">Secret key</Label>
            <Input
              id="webhook-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              type="password"
              placeholder={editing ? "Leave blank to keep current" : "Signing secret"}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={busy || !name.trim() || !url.trim()}>
            {busy ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function WebhookLogs({ webhookId }: { webhookId: number }) {
  const { data: logs = [], isPending } = useWebhookLogs(webhookId)
  const resend = useResendLog(webhookId)

  if (isPending) return <p className="text-muted-foreground px-2 py-2 text-xs">Loading logs...</p>
  if (logs.length === 0)
    return <p className="text-muted-foreground px-2 py-2 text-xs">No deliveries yet</p>

  return (
    <div className="space-y-1">
      {logs.map((log) => (
        <div key={log.id} className="flex items-center gap-2 px-2 py-1 text-xs">
          <span
            className={`font-mono font-medium ${log.status >= 200 && log.status < 300 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
          >
            {log.status || "failed"}
          </span>
          <span className="text-muted-foreground truncate font-mono">{log.url}</span>
          <span className="text-muted-foreground ml-auto shrink-0">
            {log.duration?.toFixed?.(2) ?? log.duration}s
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 shrink-0 px-2 text-xs"
            onClick={() =>
              resend.mutate(log.id, {
                onSuccess: () => toast.success("Delivery resent"),
                onError: (err) =>
                  toast.error(`Failed to resend: ${err instanceof Error ? err.message : err}`),
              })
            }
            disabled={resend.isPending}
          >
            Resend
          </Button>
        </div>
      ))}
    </div>
  )
}
