import { useProjectBySlug } from "@/lib/queries/projects"
import { ReportMasthead } from "@/components/layout/report"
import { MembersTable } from "@/components/members/members-table"

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
