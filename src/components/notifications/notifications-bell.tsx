import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Bell } from "lucide-react"
import { Avatar } from "@/components/app/avatar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { countUnread, notificationHref, notificationRoute } from "@/lib/api/notifications"
import type { WebNotification } from "@/lib/api/types"
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useWebNotifications,
} from "@/lib/queries/notifications"
import { cn } from "cn"

function formatRelative(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

/**
 * In-app notifications bell: unread badge over Taiga's web-notifications
 * feed, deep-linking into the story. Polls lightly (see useWebNotifications)
 * so mentions surface without reloads. Only user stories link anywhere —
 * other content types render as text-only rows.
 */
export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useWebNotifications()
  const markOne = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const objects = data?.objects ?? []
  const unread = countUnread(objects)

  function openNotification(n: WebNotification) {
    const route = notificationRoute(n)
    if (n.read == null) markOne.mutate(n.id)
    setOpen(false)
    // The story view highlights via ?comment= when a comment id is known;
    // the feed carries none, so land on the story.
    if (!route) return
    navigate({
      to: "/projects/$slug/board/$storyRef",
      params: { slug: route.slug, storyRef: route.storyRef },
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
            title="Notifications"
            className="relative flex size-9 items-center justify-center rounded-md hover:bg-muted"
          />
        }
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="flex" aria-hidden>
                <Bell className="h-4 w-4" />
              </span>
            }
          />
          <TooltipContent side="bottom">
            {unread > 0 ? `${unread} unread` : "Notifications"}
          </TooltipContent>
        </Tooltip>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent side="bottom" align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              Mark all read
            </Button>
          )}
        </div>

        {isLoading ? (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm">Loading…</p>
        ) : isError ? (
          <div className="px-3 py-6 text-center">
            <p className="text-muted-foreground text-sm">Couldn&apos;t load notifications.</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : objects.length === 0 ? (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm italic">
            You&apos;re all caught up
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto py-1">
            {objects.map((n) => {
              const href = notificationHref(n)
              const isUnread = n.read == null
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    disabled={!href}
                    onClick={() => openNotification(n)}
                    className={cn(
                      "flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors",
                      href && "hover:bg-accent/60",
                      isUnread && "bg-primary/[0.04]",
                    )}
                  >
                    <Avatar name={n.data.user.name} photo={n.data.user.photo} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        <span className="font-medium">{n.data.user.name}</span>{" "}
                        <span className="text-muted-foreground truncate">
                          {n.data.obj.subject}
                        </span>
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {n.data.project.slug} · {formatRelative(n.created)}
                      </span>
                    </span>
                    {isUnread && (
                      <span
                        className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        aria-label="Unread"
                      />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
