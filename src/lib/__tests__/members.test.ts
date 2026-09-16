import { describe, expect, it } from "vitest"
import { mentionUsername } from "../mentions"
import { memberPath } from "../api/users"

describe("memberPath", () => {
  it("builds the member profile path for a project", () => {
    expect(memberPath("vc", "goldavelez_org")).toBe("/projects/vc/members/goldavelez_org")
  })
})

describe("mentionUsername", () => {
  it("extracts the bare username from an @mention chip", () => {
    expect(mentionUsername("@goldavelez_org")).toBe("goldavelez_org")
    expect(mentionUsername("@alice.smith")).toBe("alice.smith")
  })

  it("returns null for anything that isn't a lone mention", () => {
    expect(mentionUsername("just text")).toBeNull()
    expect(mentionUsername("bob@example.com")).toBeNull()
    expect(mentionUsername(["@alice", " extra"])).toBeNull()
    expect(mentionUsername(null)).toBeNull()
  })
})
