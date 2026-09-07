import { describe, expect, it } from "vitest"
import { viewEnabled } from "../project-views"
import type { Project } from "@/lib/api/types"

function projectWith(overrides: Partial<Project>): Project {
  return {
    id: 1,
    name: "Test",
    slug: "test",
    description: "",
    created_date: "",
    modified_date: "",
    owner: { id: 1, username: "u", full_name: "U", full_name_display: "U", email: "", photo: null, big_photo: null, color: "#000" },
    members: [],
    is_private: false,
    total_milestones: 0,
    total_story_points: 0,
    is_kanban_activated: true,
    is_backlog_activated: true,
    is_epics_activated: true,
    is_issues_activated: true,
    is_wiki_activated: true,
    us_statuses: [],
    task_statuses: [],
    points: [],
    roles: [],
    tags: [],
    tags_colors: {},
    ...overrides,
  }
}

describe("viewEnabled", () => {
  it("enables every view on a fully-activated project", () => {
    const p = projectWith({})
    for (const view of ["board", "backlog", "epics", "velocity"] as const) {
      expect(viewEnabled(p, view)).toBe(true)
    }
  })

  it("disables everything when no project resolved yet", () => {
    for (const view of ["board", "backlog", "epics", "velocity"] as const) {
      expect(viewEnabled(null, view)).toBe(false)
    }
  })

  it("gates board on the kanban flag", () => {
    expect(viewEnabled(projectWith({ is_kanban_activated: false }), "board")).toBe(false)
    expect(viewEnabled(projectWith({ is_kanban_activated: false }), "backlog")).toBe(true)
  })

  it("gates backlog and velocity together on the backlog flag", () => {
    const p = projectWith({ is_backlog_activated: false })
    expect(viewEnabled(p, "backlog")).toBe(false)
    expect(viewEnabled(p, "velocity")).toBe(false)
    expect(viewEnabled(p, "epics")).toBe(true)
  })

  it("gates epics on the epics flag", () => {
    expect(viewEnabled(projectWith({ is_epics_activated: false }), "epics")).toBe(false)
    expect(viewEnabled(projectWith({ is_epics_activated: false }), "board")).toBe(true)
  })
})
