import { MembersTable } from "@/components/members/members-table"
import { useProjectBySlug } from "@/lib/queries/projects"

interface MembersPageProps {
  slug: string
  filter: string
}

export default function MembersPage({ slug, filter }: MembersPageProps) {
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
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          <MembersTable
            project={project}
            filter={filter}
            canManage={canManage}
          />
        </div>
      </div>
    </div>
  )
}
