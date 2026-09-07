import type { ComponentType } from "react"

export interface ChangelogEntry {
  version: string
  /** ISO date (YYYY-MM-DD) from frontmatter. */
  date: string
  title: string
  /** The MDX-compiled component — renders as React elements, no HTML strings. */
  Component: ComponentType
}

interface MdxModule {
  frontmatter: { version: string; date: string; title: string }
  default: ComponentType
}

/** Numeric semver-ish compare: 0.10.0 sorts above 0.9.0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number)
  const pb = b.split(".").map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

const modules = import.meta.glob<MdxModule>("../content/changelog/*.mdx", { eager: true })

export const changelogEntries: ChangelogEntry[] = Object.entries(modules)
  .map(([, mod]) => ({
    version: mod.frontmatter.version,
    date: mod.frontmatter.date,
    title: mod.frontmatter.title,
    Component: mod.default,
  }))
  .sort((a, b) => compareVersions(b.version, a.version))

export function latestVersion(): string | undefined {
  return changelogEntries[0]?.version
}

export function getChangelogEntry(version: string): ChangelogEntry | undefined {
  return changelogEntries.find((e) => e.version === version)
}

/** Neighbors for prev/next navigation on the detail page. */
export function changelogNeighbors(version: string): { prev: ChangelogEntry | null; next: ChangelogEntry | null } {
  const index = changelogEntries.findIndex((e) => e.version === version)
  if (index === -1) return { prev: null, next: null }
  return {
    prev: changelogEntries[index + 1] ?? null,
    next: changelogEntries[index - 1] ?? null,
  }
}
