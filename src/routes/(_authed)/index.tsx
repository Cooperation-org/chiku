import { createFileRoute, redirect } from "@tanstack/react-router"
import { queryClient } from "@/lib/query"
import { projectsQueryOptions } from "@/lib/queries/projects"
import { isArchived } from "@/lib/api/projects"
import { useProjectStore } from "@/lib/stores/project"
import { brand } from "@/lib/brand"
import { initialsFor } from "@/lib/utils/initials"

// Effect-free redirect: the loader resolves the destination before the page
// renders â€” saved slug first, else the first active project.
export const Route = createFileRoute("/(_authed)/")({
  loader: async () => {
    const projects = await queryClient.ensureQueryData(projectsQueryOptions)
    const savedSlug = useProjectStore.getState().getSavedSlug()
    const active = projects.filter((p) => !isArchived(p))
    const pick =
      (savedSlug ? projects.find((p) => p.slug === savedSlug && !isArchived(p)) : null) ??
      active[0] ??
      null
    if (pick) {
      useProjectStore.getState().setSelectedSlug(pick.slug)
      throw redirect({ to: "/projects/$slug/board", params: { slug: pick.slug }, replace: true })
    }
    return null
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="space-y-6 text-center">
        <div className="bg-card mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border">
          <span className="text-2xl font-bold">{brand.accent || initialsFor(brand.name)}</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">{brand.name}</h1>
          <p className="text-muted-foreground mt-2">
            Fast, modern project management. Powered by Chiku.
          </p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">
            No projects yet â€” create one from the sidebar to get started.
          </p>
        </div>
      </div>
    </div>
  )
}
