import { describe, expect, it } from "vitest"
import { countUnread, notificationHref, notificationRoute } from "../api/notifications"
import type { WebNotification } from "../api/types"

function makeNotification(overrides: Partial<WebNotification> = {}): WebNotification {
  return {
    id: 3,
    event_type: 5,
    user: 12,
    data: {
      obj: { id: 37, ref: 33, subject: "design tokens", content_type: "userstory" },
      user: { id: 6, name: "Golda Velez", username: "goldavelez_org", photo: null },
      project: { id: 1, name: "vc", slug: "vc" },
    },
    created: "2026-08-10T15:18:59+0000",
    read: null,
    ...overrides,
  }
}

describe("countUnread", () => {
  it("counts only notifications with read == null", () => {
    const objects = [
      makeNotification({ id: 1, read: null }),
      makeNotification({ id: 2, read: "2026-08-11T10:00:00+0000" }),
      makeNotification({ id: 3, read: null }),
    ]
    expect(countUnread(objects)).toBe(2)
  })

  it("is zero when everything is read", () => {
    expect(countUnread([makeNotification({ read: "2026-08-11T10:00:00+0000" })])).toBe(0)
  })
})

describe("notificationHref", () => {
  it("deep-links user stories to the board story route", () => {
    expect(notificationHref(makeNotification())).toBe("/projects/vc/board/33")
    expect(notificationRoute(makeNotification())).toEqual({ slug: "vc", storyRef: "33" })
  })

  it("returns null for content types with no Chiku route", () => {
    const n = makeNotification()
    n.data.obj.content_type = "issue"
    expect(notificationHref(n)).toBeNull()
  })

  it("returns null when project slug or ref is missing", () => {
    const noSlug = makeNotification()
    noSlug.data.project.slug = ""
    expect(notificationHref(noSlug)).toBeNull()
  })
})
