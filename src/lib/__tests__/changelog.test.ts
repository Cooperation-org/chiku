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
  it("loads the 0.4.0 entry newest-first", () => {
    expect(changelogEntries.length).toBeGreaterThan(0)
    expect(changelogEntries[0]?.version).toBe("0.4.0")
    expect(changelogEntries[0]?.date).toBe("2026-09-07")
    expect(changelogEntries[0]?.title).toBeTruthy()
    expect(typeof changelogEntries[0]?.Component).toBe("function")
  })

  it("exposes the latest version and lookup", () => {
    expect(latestVersion()).toBe(changelogEntries[0]?.version)
    expect(getChangelogEntry("0.4.0")).toBeDefined()
    expect(getChangelogEntry("9.9.9")).toBeUndefined()
  })

  it("provides neighbors for navigation", () => {
    const single = changelogNeighbors("0.4.0")
    expect(single.next).toBeNull()
    expect(single.prev).toBeNull()
    expect(changelogNeighbors("nope")).toEqual({ prev: null, next: null })
  })
})
