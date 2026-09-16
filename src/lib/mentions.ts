/**
 * @mention helpers for the comment/description composers.
 *
 * Scoping rule (product decision): only members of the ACTIVE project are
 * mentionable. Taiga itself only notifies project members
 * (`memberships__project_id` filter in `get_mentions`), so suggesting anyone
 * else would silently do nothing. These helpers therefore never fetch users —
 * callers pass the already project-scoped member list in, and everything here
 * is pure and unit-tested.
 */

import { Children, type ReactNode } from "react";

export interface Mentionable {
  username: string;
  full_name: string;
  /** Taiga user id — present when resolved from the member directory. */
  userId?: number;
}

export interface MentionQuery {
  /** The partial text after `@` (may be empty for a bare `@`). */
  query: string
  /** Index of the `@` character in the full value. */
  start: number
}

/** Chars allowed in a Taiga username fragment while typing. */
const QUERY_CHAR = /[\w.-]/

/** Chars that may legally precede an `@` trigger (mirrors remarkTaigaRefs). */
function isTriggerBoundary(ch: string | undefined): boolean {
  return ch === undefined || ch === "" || /[\s(>[,]/.test(ch)
}

/**
 * Find an open `@mention` query ending at `caret`.
 * Returns null when the caret is not inside a mention trigger — e.g. inside
 * an email address (`bob@…`), after whitespace, or when no `@` is open.
 */
export function findMentionQuery(
  value: string,
  caret: number
): MentionQuery | null {
  const pos = Math.max(0, Math.min(caret, value.length))
  let i = pos - 1
  while (i >= 0 && QUERY_CHAR.test(value[i]!)) i--
  if (i < 0 || value[i] !== "@") return null
  if (!isTriggerBoundary(value[i - 1])) return null
  return { query: value.slice(i + 1, pos), start: i }
}

/**
 * Filter a project-scoped member list by the typed query.
 * Rank: username prefix → username substring → full-name substring.
 * Dedupes case-insensitively; caps at `limit`.
 */
export function filterMentionable(
  members: Mentionable[],
  query: string,
  limit = 6
): Mentionable[] {
  const q = query.toLowerCase()
  const seen = new Set<string>()
  const ranked: { score: number; m: Mentionable }[] = []
  for (const m of members) {
    const uname = (m.username || "").trim()
    if (!uname) continue
    const key = uname.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const unameLower = key
    const nameLower = (m.full_name || "").toLowerCase()
    let score = -1
    if (q === "") score = 0
    else if (unameLower.startsWith(q)) score = 0
    else if (unameLower.includes(q)) score = 1
    else if (nameLower.includes(q)) score = 2
    if (score >= 0) ranked.push({ score, m })
  }
  ranked.sort(
    (a, b) =>
      a.score - b.score ||
      a.m.username.toLowerCase().localeCompare(b.m.username.toLowerCase())
  )
  return ranked.slice(0, limit).map((r) => r.m)
}

/** Replace the open `@query` ending at `caret` with `@username ` (trailing space). */
export function insertMention(
  value: string,
  caret: number,
  username: string
): { text: string; caret: number } {
  const found = findMentionQuery(value, caret)
  const clean = username.trim()
  if (!found || !clean) return { text: value, caret }
  const replacement = `@${clean} `
  const text = value.slice(0, found.start) + replacement + value.slice(caret)
  return { text, caret: found.start + replacement.length }
}

const MAX_QUOTE_CHARS = 400
const MAX_QUOTE_LINES = 6

/**
 * Build a quote-reply prefix for the composer. Taiga comments are flat, so a
 * "reply" is a normal comment that @mentions the author and block-quotes
 * their words — fully backend-compatible, no schema change.
 */
export function buildQuoteReply(
  username: string,
  commentText: string,
  displayName?: string
): string {
  const clean = username.trim() || "unknown"
  const lines = (commentText || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, MAX_QUOTE_LINES)
  let quote = lines.join("\n")
  if (quote.length > MAX_QUOTE_CHARS)
    quote = `${quote.slice(0, MAX_QUOTE_CHARS).trimEnd()}…`
  const quoted = quote
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n")
  const who =
    displayName && displayName !== clean
      ? `${displayName} (@${clean})`
      : `@${clean}`
  return `@${clean} — replying to ${who}\n${quoted}\n\n`
}

/**
 * Extract the bare username from a rendered mention's `@name` text child.
 * Used to link @mention chips to member profiles. Returns null for anything
 * that isn't exactly one lone mention.
 */
export function mentionUsername(children: ReactNode): string | null {
  const arr = Children.toArray(children)
  if (arr.length !== 1 || typeof arr[0] !== "string") return null
  const m = /^@([\w][\w.-]*)$/.exec(arr[0].trim())
  return m?.[1] ?? null
}
