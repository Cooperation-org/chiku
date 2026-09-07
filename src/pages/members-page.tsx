import { toast } from "sonner"
import { X } from "lucide-react"
import { Avatar } from "@/components/app/avatar"
import { Button } from "@/components/ui/button"
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
  useMemberships,
  useRemoveMembership,
} from "@/lib/queries/memberships"
import { useProjectBySlug } from "@/lib/queries/projects"
import { ReportMasthead } from "@/components/layout/report"
import type { Project } from "@/lib/api/types"

interface MembersPageProps {
  slug: string
}

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
      <div className="mx-auto w-full max-w-3xl px-6">
        <div className="border-b py-3">
          <ReportMasthead kicker="Team" tag={project.name} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          <MembersTable project={project} canManage={canManage} />
        </div>
      </div>
    </div>
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
