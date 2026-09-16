import { describe, expect, it } from "vitest"
import {
  buildQuoteReply,
  filterMentionable,
  findMentionQuery,
  insertMention,
  type Mentionable,
} from "../mentions"

const members: Mentionable[] = [
  { username: "alice", full_name: "Alice Cooper" },
  { username: "alice.smith", full_name: "Alice Smith" },
  { username: "bob-jones", full_name: "Bob Jones" },
  { username: "carol", full_name: "Carol Danvers" },
]

describe("findMentionQuery", () => {
  it("finds a bare @ at the caret", () => {
    expect(findMentionQuery("hello @", 7)).toEqual({ query: "", start: 6 })
  })

  it("finds a partial query", () => {
    expect(findMentionQuery("ping @ali", 9)).toEqual({ query: "ali", start: 5 })
  })

  it("finds a mention at the start of the value", () => {
    expect(findMentionQuery("@bob", 4)).toEqual({ query: "bob", start: 0 })
  })

  it("finds a mention after a newline or paren", () => {
    expect(findMentionQuery("see\n@carol", 10)).toEqual({
      query: "carol",
      start: 4,
    })
    expect(findMentionQuery("(@bob)", 5)).toEqual({ query: "bob", start: 1 })
  })

  it("ignores email addresses", () => {
    expect(findMentionQuery("mail bob@example.com", 21)).toBeNull()
  })

  it("returns null when the query was terminated by a space", () => {
    expect(findMentionQuery("hey @alice how", 14)).toBeNull()
  })

  it("returns null with no @ present", () => {
    expect(findMentionQuery("just text", 9)).toBeNull()
  })
})

describe("filterMentionable", () => {
  it("returns members for an empty query, capped at the limit", () => {
    expect(filterMentionable(members, "", 2)).toHaveLength(2)
    expect(filterMentionable(members, "")).toHaveLength(4)
  })

  it("prefers username prefix matches", () => {
    const out = filterMentionable(members, "ali")
    expect(out.map((m) => m.username)).toEqual(["alice", "alice.smith"])
  })

  it("matches full names too", () => {
    expect(
      filterMentionable(members, "danvers").map((m) => m.username)
    ).toEqual(["carol"])
  })

  it("is case-insensitive and dedupes", () => {
    const dupes: Mentionable[] = [
      ...members,
      { username: "Alice", full_name: "Alice Dup" },
    ]
    const out = filterMentionable(dupes, "ALICE")
    expect(out.map((m) => m.username)).toEqual(["alice", "alice.smith"])
  })

  it("returns nothing for outsiders — the list is the scope", () => {
    expect(filterMentionable(members, "mallory")).toEqual([])
  })
})

describe("insertMention", () => {
  it("replaces the open query with the chosen username plus a space", () => {
    expect(insertMention("ping @ali", 9, "alice")).toEqual({
      text: "ping @alice ",
      caret: 12,
    })
  })

  it("leaves the value alone when there is no open query", () => {
    expect(insertMention("ping alice", 10, "alice")).toEqual({
      text: "ping alice",
      caret: 10,
    })
  })
})

describe("buildQuoteReply", () => {
  it("mentions the author and block-quotes their comment", () => {
    const out = buildQuoteReply(
      "bob-jones",
      "Can we ship this?\nSecond line",
      "Bob Jones"
    )
    expect(out).toContain("@bob-jones")
    expect(out).toContain("> Can we ship this?")
    expect(out.endsWith("\n\n")).toBe(true)
  })

  it("trims long comments to a short quote", () => {
    const out = buildQuoteReply("alice", `${"x".repeat(500)}\nsecond`, "Alice")
    expect(out.length).toBeLessThan(600)
    expect(out).toContain("…")
  })
})
