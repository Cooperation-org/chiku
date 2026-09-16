import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { Avatar } from "@/components/app/avatar"
import { PagePresence, PageTransition } from "@/components/layout/page-transition"
import { PageLoading, PageNotFound } from "@/components/layout/page-state"
import { Button } from "@/components/ui/button"
import { useMemberships } from "@/lib/queries/memberships"
import { useProjectBySlug } from "@/lib/queries/projects"
import { useMemberProfile, useMemberStats } from "@/lib/queries/users"

interface MemberPageProps {
  slug: string
  username: string
}

/**
 * Member profile — reachable by clicking an @mention anywhere. Resolves by
 * exact username (GET /users/by_username), so no id lookup is needed.
 */
export default function MemberPage({ slug, username }: MemberPageProps) {
  const { project: currentProject } = useProjectBySlug(slug)
  const projectId = currentProject?.id ?? null

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
  } = useMemberProfile(username)
  const { data: stats } = useMemberStats(profile?.id ?? null)
  const { data: memberships = [] } = useMemberships(projectId)
  const membership = memberships.find((m) => profile != null && m.user === profile.id)

  return (
    <PagePresence>
      {profileLoading ? (
        <PageLoading key="loading" label="Loading member" />
      ) : profileError || !profile ? (
        <PageNotFound
          key="missing"
          title={`@${username} was not found`}
          description="They may not exist, or their profile isn't visible to you."
          action={
            <Button
              variant="outline"
              render={<Link to="/projects/$slug/members" params={{ slug }} />}
            >
              Back to members
            </Button>
          }
        />
      ) : (
        <PageTransition key={profile.id}>
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="mx-auto max-w-3xl space-y-6">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2 w-fit"
                  render={<Link to="/projects/$slug/members" params={{ slug }} />}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Members
                </Button>

                <div className="flex items-center gap-4">
                  <Avatar
                    name={profile.full_name_display || profile.username}
                    photo={profile.photo}
                    color={profile.color}
                    size="xl"
                  />
                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-semibold">
                      {profile.full_name_display || profile.username}
                    </h1>
                    <p className="text-primary font-mono text-sm">@{profile.username}</p>
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap">{profile.bio}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  {membership ? (
                    <>
                      <span className="rounded bg-accent px-2 py-1 text-xs">
                        {membership.role_name}
                      </span>
                      {membership.is_owner && (
                        <span className="rounded-full border px-2 py-1 text-xs font-medium text-primary">
                          owner
                        </span>
                      )}
                      {membership.is_admin && !membership.is_owner && (
                        <span className="rounded-full border px-2 py-1 text-xs font-medium text-primary">
                          admin
                        </span>
                      )}
                      {!membership.is_active && (
                        <span className="text-muted-foreground rounded-full border px-2 py-1 text-xs">
                          invite pending
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm italic">
                      Not a member of this project
                    </span>
                  )}
                  {profile.roles
                    .filter((r) => r !== membership?.role_name)
                    .slice(0, 5)
                    .map((r) => (
                      <span
                        key={r}
                        className="text-muted-foreground rounded bg-accent/60 px-2 py-1 text-xs"
                        title="Role in another project"
                      >
                        {r}
                      </span>
                    ))}
                </div>

                {stats && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Stories closed", value: stats.total_num_closed_userstories },
                      { label: "Projects", value: stats.total_num_projects },
                      { label: "Contacts", value: stats.total_num_contacts },
                    ].map((s) => (
                      <div key={s.label} className="rounded-md border px-3 py-2.5 text-center">
                        <p className="text-xl font-semibold">{s.value}</p>
                        <p className="text-muted-foreground text-xs">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </PageTransition>
      )}
    </PagePresence>
  )
}
