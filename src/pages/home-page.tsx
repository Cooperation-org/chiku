import { useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useProjects } from "@/lib/queries/projects"
import { isArchived } from "@/lib/api/projects"
import { useProjectStore } from "@/lib/stores/project"
import { useAuth } from "@/lib/stores/auth"
import { Avatar } from "@/components/app/avatar"
import { BrandLogo } from "@/components/app/brand-logo"

export default function HomePage() {
  const navigate = useNavigate()
  const { data: projects, isLoading } = useProjects()
  const { user } = useAuth()
  const { setProject, getSavedId } = useProjectStore()

  // Same pick order as the old layout: saved id, else first active project.
  useEffect(() => {
    if (!projects) return
    const active = projects.filter((p) => !isArchived(p))
    const savedId = getSavedId()
    const pick = (savedId ? projects.find((p) => p.id === savedId) : null) ?? active[0] ?? null
    if (pick) {
      setProject(pick)
      navigate({ to: "/p/$slug/board", params: { slug: pick.slug }, replace: true })
    }
  }, [projects, navigate, setProject, getSavedId])

  return (
    <div className="flex h-full items-center justify-center">
      <div className="space-y-6 text-center">
        <BrandLogo className="mx-auto h-24 w-24" />
        <div>
          <h1 className="text-2xl font-bold">TaigaLT</h1>
          <p className="text-muted-foreground mt-2">Fast, modern project management powered by Taiga</p>
        </div>
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading projects&hellip;</div>
        ) : (
          <div className="bg-card rounded-lg border p-4">
            <p className="text-muted-foreground text-sm">Select a project from the sidebar to get started</p>
          </div>
        )}
        {user && (
          <div className="flex items-center justify-center gap-2 border-t pt-6">
            <Avatar name={user.full_name || user.username} photo={user.photo} color={user.color} size="sm" />
            <span className="text-muted-foreground text-xs">Signed in as {user.username}</span>
          </div>
        )}
      </div>
    </div>
  )
}


