import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Avatar } from "@/components/app/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAddMembership, useMemberships, useRemoveMembership, useRoles, searchUsers } from "@/lib/queries/memberships"
import type { Project } from "@/lib/api/types"

interface MembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
}

export function MembersDialog({ open, onOpenChange, project }: MembersDialogProps) {
  const canManage = project.i_am_admin === true
  const { data: memberships = [], isLoading } = useMemberships(open ? project.id : null)
  const { data: roles = [] } = useRoles(open ? project.id : null)
  const addMembership = useAddMembership(project.id)
  const removeMembership = useRemoveMembership(project.id)

  const [search, setSearch] = useState("")
  const [results, setResults] = useState<{ id: number; username: string; full_name: string }[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [roleId, setRoleId] = useState<string>("")

  useEffect(() => {
    if (!open) return
    setSearch("")
    setResults([])
    setSelectedUser("")
    setRoleId(roles[0] ? String(roles[0].id) : "")
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!canManage) return
    const q = search.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(() => {
      searchUsers(q)
        .then(setResults)
        .catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(timer)
  }, [search, canManage])

  async function handleAdd() {
    if (!selectedUser || !roleId) return
    try {
      await addMembership.mutateAsync({ username: selectedUser, roleId: Number(roleId) })
      toast(`Added ${selectedUser}`)
      setSelectedUser("")
      setSearch("")
      setResults([])
    } catch (err) {
      toast.error(`Failed to add member: ${(err as Error).message}`)
    }
  }

  async function handleRemove(membershipId: number, name: string) {
    try {
      await removeMembership.mutateAsync(membershipId)
      toast(`Removed ${name}`)
    } catch (err) {
      toast.error(`Failed to remove: ${(err as Error).message}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Members — {project.name}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="p-6 text-center text-muted-foreground">Loading members...</div>
        ) : (
          <div className="space-y-1">
            {memberships.map((m) => (
              <div
                key={m.id}
                className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
              >
                <Avatar name={m.full_name} photo={m.photo} color={m.color} size="sm" className="text-white" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{m.full_name || `user ${m.user}`}</span>
                  <span className="text-muted-foreground text-xs">{m.role_name}</span>
                </div>
                {m.is_admin && (
                  <span className="text-primary text-xs font-medium">admin</span>
                )}
                {canManage && !m.is_owner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => handleRemove(m.id, m.full_name)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {canManage && (
          <div className="space-y-3 border-t pt-4">
            <Label>Add a member</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by username…"
            />
            {results.length > 0 && (
              <Select value={selectedUser} onValueChange={(v) => setSelectedUser(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={results.length ? "Pick a user" : "No matches"} />
                </SelectTrigger>
                <SelectContent>
                  {results.map((u) => (
                    <SelectItem key={u.id} value={u.username}>
                      {u.full_name || u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-2">
              <Select value={roleId} onValueChange={(v) => setRoleId(v ?? "")}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} disabled={!selectedUser || !roleId || addMembership.isPending}>
                {addMembership.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
