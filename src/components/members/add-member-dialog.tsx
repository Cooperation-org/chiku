import { useState } from "react"
import { toast } from "sonner"
import { Avatar } from "@/components/app/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MemberRoleSelect } from "@/components/inputs/member-role-select"
import { useAddMembership, searchUsers } from "@/lib/queries/memberships"
import type { Project } from "@/lib/api/types"

type SearchHit = { id: number; username: string; full_name: string }

/** The add-member form, opened from the toolbar's plus button. */
export function AddMemberDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
}) {
  const addMembership = useAddMembership(project.id)

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchHit[]>([])
  const [selected, setSelected] = useState<SearchHit | null>(null)
  const [roleId, setRoleId] = useState<string>("")

  // Event-driven lookup: no effects, the search runs when you ask it to.
  async function runSearch() {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    try {
      setResults(await searchUsers(q))
    } catch {
      setResults([])
    }
  }

  async function handleAdd() {
    if (!selected || !roleId) return
    try {
      await addMembership.mutateAsync({
        username: selected.username,
        roleId: Number(roleId),
      })
      toast(`Added ${selected.full_name || selected.username}`)
      setQuery("")
      setResults([])
      setSelected(null)
      setRoleId("")
      onOpenChange(false)
    } catch (err) {
      toast.error(`Failed to add member: ${(err as Error).message}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add members</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1 space-y-1.5">
            <Label htmlFor="member-search" className="text-xs">
              Find user (username)
            </Label>
            <div className="flex gap-2">
              <Input
                id="member-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    runSearch()
                  }
                }}
                placeholder="e.g. alexkh"
                autoFocus
              />
              <Button variant="outline" onClick={runSearch}>
                Search
              </Button>
            </div>
          </div>
          <div className="w-40 space-y-1.5">
            <Label className="text-xs">Role</Label>
            <MemberRoleSelect
              projectId={project.id}
              value={roleId}
              onValueChange={setRoleId}
              disabled={!selected}
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={!selected || !roleId || addMembership.isPending}
          >
            {addMembership.isPending ? "Adding..." : "Add"}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="mt-2 rounded-md border bg-background">
            {results.map((hit) => (
              <button
                key={hit.id}
                onClick={() => {
                  setSelected(hit)
                  setResults([])
                  setQuery(hit.full_name || hit.username)
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors first:rounded-t-md last:rounded-b-md hover:bg-accent ${
                  selected?.id === hit.id ? "bg-accent" : ""
                }`}
              >
                <Avatar
                  name={hit.full_name || hit.username}
                  size="sm"
                  className="text-white"
                />
                <span className="truncate">{hit.full_name || hit.username}</span>
                <span className="text-xs text-muted-foreground">
                  @{hit.username}
                </span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
