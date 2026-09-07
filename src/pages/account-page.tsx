import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { LogOut, Pencil } from "lucide-react"
import { toast } from "sonner"
import { Avatar } from "@/components/app/avatar"
import { ProfileDialog } from "@/components/app/profile-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  PagePresence,
  PageTransition,
} from "@/components/layout/page-transition"
import { useMe, type Me } from "@/lib/queries/users"
import { useAuth } from "@/lib/stores/auth"

/**
 * Your account: who you are on this Taiga, and the one place to sign out.
 * Profile editing (name, icon, colour) opens the existing profile dialog.
 */
export default function AccountPage() {
  const navigate = useNavigate()
  const logout = useAuth((s) => s.logout)
  const { data: me, isPending, isError, refetch } = useMe()
  const [showProfile, setShowProfile] = useState(false)

  function handleLogout() {
    logout()
    toast("Signed out")
    navigate({ to: "/login" })
  }

  function handleUpdated(updated: Me) {
    useAuth.getState().setProfile({
      full_name: updated.full_name,
      full_name_display: updated.full_name_display,
      photo: updated.photo,
      color: updated.color,
    })
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Account</h1>
          <p className="text-sm text-muted-foreground">
            Who you are on this Taiga
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <PagePresence>
            {isPending ? (
              <div
                key="pending"
                className="flex items-center gap-4 rounded-lg border bg-card p-6"
              >
                <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ) : isError || !me ? (
              <PageTransition key="error">
                <div className="rounded-lg border bg-card p-6 text-center">
                  <p className="mb-3 text-sm text-muted-foreground">
                    Could not load your profile.
                  </p>
                  <Button variant="outline" onClick={() => void refetch()}>
                    Retry
                  </Button>
                </div>
              </PageTransition>
            ) : (
              <PageTransition key="profile">
                <section className="rounded-lg border bg-card">
                  <div className="flex items-center gap-4 p-6">
                    <Avatar
                      name={me.full_name || me.username}
                      photo={me.photo}
                      color={me.color}
                      variant="marble"
                      size="xl"
                      className="text-white"
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold">
                        {me.full_name_display || me.full_name || me.username}
                      </h2>
                      <p className="truncate text-sm text-muted-foreground">
                        @{me.username}
                      </p>
                      {me.email && (
                        <p className="truncate text-sm text-muted-foreground">
                          {me.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t p-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowProfile(true)}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit name &amp; icon
                    </Button>
                  </div>
                </section>
              </PageTransition>
            )}
          </PagePresence>

          <section className="rounded-lg border bg-card">
            <div className="flex items-center justify-between p-4">
              <div>
                <h3 className="text-sm font-medium">Session</h3>
                <p className="text-sm text-muted-foreground">
                  Sign out of this browser. Your other sessions stay signed in.
                </p>
              </div>
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </section>
        </div>
      </div>

      <ProfileDialog
        open={showProfile}
        onOpenChange={setShowProfile}
        onUpdated={handleUpdated}
      />
    </div>
  )
}
