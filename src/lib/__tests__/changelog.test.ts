import { describe, expect, it } from "vitest"
import {
  changelogEntries,
  changelogNeighbors,
  compareVersions,
  getChangelogEntry,
  latestVersion,
} from "../changelog"

describe("compareVersions", () => {
  it("orders numerically per segment", () => {
    expect(compareVersions("0.10.0", "0.9.0")).toBeGreaterThan(0)
    expect(compareVersions("1.0.0", "0.9.9")).toBeGreaterThan(0)
    expect(compareVersions("0.4.0", "0.4.0")).toBe(0)
    expect(compareVersions("0.4.1", "0.4.0")).toBeGreaterThan(0)
  })
})

describe("changelog entries", () => {
  it("loads entries newest-first with valid frontmatter", () => {
    expect(changelogEntries.length).toBeGreaterThan(1)
    for (let i = 1; i < changelogEntries.length; i++) {
      expect(compareVersions(changelogEntries[i - 1]!.version, changelogEntries[i]!.version)).toBeGreaterThan(0)
    }
    expect(changelogEntries[0]?.version).toBe("0.4.2")
    expect(changelogEntries[0]?.date).toBe("2026-09-07")
    for (const entry of changelogEntries) {
      expect(entry.title).toBeTruthy()
      expect(typeof entry.Component).toBe("function")
    }
  })

  it("exposes the latest version and lookup", () => {
    expect(latestVersion()).toBe(changelogEntries[0]?.version)
    expect(getChangelogEntry("0.4.2")).toBeDefined()
    expect(getChangelogEntry("0.4.0")).toBeDefined()
    expect(getChangelogEntry("9.9.9")).toBeUndefined()
  })

  it("provides neighbors for navigation", () => {
    const newest = changelogNeighbors("0.4.2")
    expect(newest.next).toBeNull()
    expect(newest.prev).toBeDefined()

    const oldest = changelogNeighbors("0.4.0")
    expect(oldest.prev).toBeNull()
    expect(oldest.next).toBeDefined()

    expect(changelogNeighbors("nope")).toEqual({ prev: null, next: null })
  })
})
