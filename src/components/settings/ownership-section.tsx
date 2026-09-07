import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { OptionsSelect } from "@/components/inputs/options-select"
import { SettingsSection } from "@/components/settings/settings-section"
import {
  useLeaveProject,
  useTransferAccept,
  useTransferReject,
  useTransferRequest,
  useTransferStart,
  useTransferValidate,
} from "@/lib/queries/project-settings"
import { useMemberships } from "@/lib/queries/memberships"
import { firstIssue, transferTokenSchema } from "@/lib/schemas/settings"
import type { Project } from "@/lib/api/types"

export function OwnershipSection({ project }: { project: Project }) {
  const navigate = useNavigate()
  const leave = useLeaveProject()
  const request = useTransferRequest(project.id)
  const start = useTransferStart(project.id)
  const validate = useTransferValidate(project.id)
  const accept = useTransferAccept(project.id)
  const reject = useTransferReject(project.id)
  const { data: memberships = [] } = useMemberships(project.i_am_owner ? project.id : null)

  const [userId, setUserId] = useState("")
  const [token, setToken] = useState("")
  const [reason, setReason] = useState("")
  const [tokenValid, setTokenValid] = useState(false)

  const isOwner = project.i_am_owner === true
  // Only other admins can receive ownership.
  const adminMembers = memberships.filter((m) => m.is_admin && !m.is_owner && m.is_active)

  function handleLeave() {
    leave.mutate(project.id, {
      onSuccess: () => {
        toast.success("You left the project")
        navigate({ to: "/" })
      },
      onError: (err) =>
        toast.error(`Failed to leave: ${err instanceof Error ? err.message : err}`),
    })
  }

  function handleRequest() {
    request.mutate(undefined, {
      onSuccess: () => toast.success("Transfer requested — the owner has been notified"),
      onError: (err) =>
        toast.error(`Failed to request transfer: ${err instanceof Error ? err.message : err}`),
    })
  }

  function handleStart() {
    const id = Number(userId)
    if (!id) {
      toast.error("Pick a member to transfer to")
      return
    }
    start.mutate(id, {
      onSuccess: () => toast.success("Transfer started — the new owner must accept via email"),
      onError: (err) =>
        toast.error(`Failed to start transfer: ${err instanceof Error ? err.message : err}`),
    })
  }

  function handleValidate() {
    const parsed = transferTokenSchema.safeParse({ token, reason })
    if (!parsed.success) {
      toast.error(firstIssue(parsed.error))
      return
    }
    validate.mutate(parsed.data.token, {
      onSuccess: () => {
        toast.success("Token is valid — accept or reject below")
        setTokenValid(true)
      },
      onError: (err) =>
        toast.error(`Invalid token: ${err instanceof Error ? err.message : err}`),
    })
  }

  function handleAccept() {
    const parsed = transferTokenSchema.safeParse({ token, reason })
    if (!parsed.success) {
      toast.error(firstIssue(parsed.error))
      return
    }
    accept.mutate(parsed.data, {
      onSuccess: () => {
        toast.success("Ownership accepted")
        setToken("")
        setReason("")
        setTokenValid(false)
      },
      onError: (err) =>
        toast.error(`Failed to accept: ${err instanceof Error ? err.message : err}`),
    })
  }

  function handleReject() {
    const parsed = transferTokenSchema.safeParse({ token, reason })
    if (!parsed.success) {
      toast.error(firstIssue(parsed.error))
      return
    }
    reject.mutate(parsed.data, {
      onSuccess: () => {
        toast.success("Transfer rejected")
        setToken("")
        setReason("")
        setTokenValid(false)
      },
      onError: (err) =>
        toast.error(`Failed to reject: ${err instanceof Error ? err.message : err}`),
    })
  }

  return (
    <SettingsSection title="Ownership" description="Leave the project or transfer it to another admin.">
      <div className="space-y-4">
        {!isOwner && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleLeave} disabled={leave.isPending}>
              {leave.isPending ? "Leaving..." : "Leave project"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRequest} disabled={request.isPending}>
              {request.isPending ? "Requesting..." : "Request ownership"}
            </Button>
          </div>
        )}
        {isOwner && (
          <div className="space-y-1.5">
            <Label className="text-xs">Transfer to an admin member</Label>
            <div className="flex items-end gap-2">
              <div className="w-56 space-y-1.5">
                <span className="text-muted-foreground text-xs">New owner</span>
                <OptionsSelect
                  options={adminMembers.map((m) => ({
                    value: String(m.user),
                    label: m.full_name || m.email || `user ${m.user}`,
                  }))}
                  value={userId || null}
                  onValueChange={setUserId}
                  placeholder={adminMembers.length === 0 ? "No other admins" : "Pick a member..."}
                  disabled={adminMembers.length === 0}
                  ariaLabel="New owner"
                />
              </div>
              <Button variant="outline" onClick={handleStart} disabled={!userId || start.isPending}>
                {start.isPending ? "Starting..." : "Start transfer"}
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-1.5 border-t pt-3">
          <Label htmlFor="transfer-token" className="text-xs">
            Incoming transfer token (from email)
          </Label>
          <div className="flex gap-2">
            <Input
              id="transfer-token"
              value={token}
              onChange={(e) => {
                setToken(e.target.value)
                setTokenValid(false)
              }}
              placeholder="Paste token..."
              className="font-mono"
            />
            <Button variant="outline" onClick={handleValidate} disabled={!token.trim() || validate.isPending}>
              {validate.isPending ? "Checking..." : "Validate"}
            </Button>
          </div>
          {tokenValid && (
            <div className="space-y-1.5">
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional)"
                rows={2}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAccept} disabled={accept.isPending}>
                  {accept.isPending ? "Accepting..." : "Accept ownership"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReject}
                  disabled={reject.isPending}
                >
                  {reject.isPending ? "Rejecting..." : "Reject"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SettingsSection>
  )
}
