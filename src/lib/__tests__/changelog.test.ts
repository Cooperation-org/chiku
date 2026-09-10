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
    for (const entry of changelogEntries) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(entry.title).toBeTruthy()
      expect(typeof entry.Component).toBe("function")
    }
  })

  it("exposes the latest version and lookup", () => {
    expect(latestVersion()).toBe(changelogEntries[0]?.version)
    for (const entry of changelogEntries) {
      expect(getChangelogEntry(entry.version)).toBeDefined()
    }
    expect(getChangelogEntry("9.9.9")).toBeUndefined()
  })

  it("provides neighbors for navigation", () => {
    const versions = [...changelogEntries].sort((a, b) => compareVersions(a.version, b.version))
    expect(versions.length).toBe(changelogEntries.length)

    // Newest has no newer neighbor; its older neighbor is the runner-up.
    const newest = changelogNeighbors(changelogEntries[0]!.version)
    expect(newest.next).toBeNull()
    expect(newest.prev?.version).toBe(changelogEntries[1]?.version ?? null)

    // Oldest has no older neighbor; its newer neighbor is the runner-up.
    const oldestVersion = versions[0]!.version
    const oldest = changelogNeighbors(oldestVersion)
    expect(oldest.prev).toBeNull()
    expect(oldest.next?.version).toBe(
      versions.length > 1 ? versions[versions.length - 2]!.version : null,
    )

    expect(changelogNeighbors("nope")).toEqual({ prev: null, next: null })
  })
})
