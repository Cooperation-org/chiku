import { api } from "./client";
import type { WebNotification, WebNotificationsResponse } from "./types";

/**
 * In-app notifications (the bell). Verified against taiga-back 6.8.1
 * (`WebNotificationsViewSet` — no trailing slashes, like the comment
 * endpoints):
 * - GET  /web-notifications                  → { objects, total }
 * - POST /web-notifications/set-as-read      → marks EVERYTHING read
 * - PATCH /web-notifications/{id}/set-as-read → marks ONE read
 */

export async function listWebNotifications(): Promise<WebNotificationsResponse> {
	const res = await api.get<WebNotificationsResponse | WebNotification[]>(
		"/web-notifications",
	);
	// Paginated shape when the backend paginates, bare list otherwise.
	if (Array.isArray(res)) return { objects: res, total: res.length };
	return res;
}

/** Mark one notification read. */
export async function markWebNotificationRead(id: number): Promise<void> {
	await api.patch(`/web-notifications/${id}/set-as-read`, {});
}

/** Mark every notification read. Deliberately separate — bare POST is destructive. */
export async function markAllWebNotificationsRead(): Promise<void> {
	await api.post("/web-notifications/set-as-read");
}

/** Unread = `read` is null. */
export function countUnread(objects: WebNotification[]): number {
	return objects.filter((n) => n.read == null).length;
}

/**
 * Where a notification leads in Chiku. Only user stories have a route —
 * anything else renders as a text-only row (returns null).
 */
export function notificationRoute(n: WebNotification): { slug: string; storyRef: string } | null {
  if (n.data?.obj?.content_type !== "userstory") return null
  const slug = n.data?.project?.slug
  const ref = n.data?.obj?.ref
  if (!slug || ref == null) return null
  return { slug, storyRef: String(ref) }
}

/** Deep link path for a notification, or null when it has no Chiku route. */
export function notificationHref(n: WebNotification): string | null {
  const route = notificationRoute(n)
  return route ? `/projects/${route.slug}/board/${route.storyRef}` : null
}
