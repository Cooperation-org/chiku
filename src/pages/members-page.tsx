import { useState } from "react"
import { toast } from "sonner"
import { UserPlus, X } from "lucide-react"
import { Avatar } from "@/components/app/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MemberRoleSelect } from "@/components/inputs/member-role-select"
import { BrailleLoader } from "@/components/ui/braille-loader"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useAddMembership,
  useMemberships,
  useRemoveMembership,
  searchUsers,
} from "@/lib/queries/memberships"
import { useProjectBySlug } from "@/lib/queries/projects"
import type { Project } from "@/lib/api/types"

interface MembersPageProps {
  slug: string
}

type SearchHit = { id: number; username: string; full_name: string }

export default function MembersPage({ slug }: MembersPageProps) {
  const { project } = useProjectBySlug(slug)
  const canManage = project?.i_am_admin === true

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">
          Select a project to view its members
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Members</h1>
          <p className="text-sm text-muted-foreground">
            {project.name} Â· who is on the team
          </p>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {canManage && <AddMemberPanel project={project} />}
          <MembersTable project={project} canManage={canManage} />
        </div>
      </div>
    </div>
  )
}

function AddMemberPanel({ project }: { project: Project }) {
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
    } catch (err) {
      toast.error(`Failed to add member: ${(err as Error).message}`)
    }
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <UserPlus className="h-4 w-4" /> Add members
      </h2>
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
    </section>
  )
}

function MembersTable({
  project,
  canManage,
}: {
  project: Project
  canManage: boolean
}) {
  const { data: memberships = [], isLoading } = useMemberships(project.id)
  const removeMembership = useRemoveMembership(project.id)

  async function handleRemove(m: { id: number; full_name: string }) {
    try {
      await removeMembership.mutateAsync(m.id)
      toast(`Removed ${m.full_name}`)
    } catch (err) {
      toast.error(`Failed to remove: ${(err as Error).message}`)
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="w-40">Role</TableHead>
            <TableHead className="w-24 text-right">Access</TableHead>
            {canManage && (
              <TableHead className="w-20 text-right">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={canManage ? 4 : 3}
                className="py-8 text-center"
              >
                {/* Inline loader — a full-height PageLoading would break the table shape. */}
                <BrailleLoader
                  variant="chase"
                  speed="fast"
                  label="Loading members"
                  fontSize={16}
                  className="justify-center text-muted-foreground"
                />
              </TableCell>
            </TableRow>
          ) : memberships.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={canManage ? 4 : 3}
                className="py-8 text-center text-muted-foreground"
              >
                No members yet
              </TableCell>
            </TableRow>
          ) : (
            memberships.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar
                      name={m.full_name}
                      photo={m.photo}
                      size="sm"
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="block truncate text-sm">
                        {m.full_name || `user ${m.user}`}
                      </span>
                      {m.email && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {m.email}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="rounded bg-accent px-2 py-0.5 text-xs">
                      {m.role_name}
                    </span>
                    {m.is_owner && (
                      <span className="rounded-full border px-2 py-0.5 text-xs font-medium text-primary">
                        owner
                      </span>
                    )}
                    {m.is_admin && !m.is_owner && (
                      <span className="rounded-full border px-2 py-0.5 text-xs font-medium text-primary">
                        admin
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={`text-xs font-medium ${m.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
                  >
                    {m.is_active ? "active" : "pending"}
                  </span>
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    {!m.is_owner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(m)}
                        disabled={removeMembership.isPending}
                      >
                        <X className="h-3.5 w-3.5" /> Remove
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  )
}
