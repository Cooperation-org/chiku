/**
 * Pie-slicing value tags (frontend-only integration).
 *
 * Convention (matches `mcp-taiga` and GovKit's `parse_direct_value`):
 * - team value lives in a tag like `50cook` (number + unit, no space)
 * - cash lives in a tag like `100usd`
 * - Taiga tags arrive as `[name, color]` pairs; only the name matters here.
 *
 * Defaults are `cook` / `usd` unless the deployment provides its own unit
 * via `VITE_VALUE_UNIT` / `VITE_CASH_UNIT` (same build-time mechanism as
 * branding). An explicit pattern always wins over the unit-derived one.
 */

export const DEFAULT_TEAM_UNIT = "cook";
export const DEFAULT_CASH_UNIT = "usd";

export function teamUnit(): string {
  return (import.meta.env.VITE_VALUE_UNIT as string | undefined)?.trim() || DEFAULT_TEAM_UNIT;
}

export function cashUnit(): string {
  return (import.meta.env.VITE_CASH_UNIT as string | undefined)?.trim() || DEFAULT_CASH_UNIT;
}

/** Escape a literal unit so it can be embedded in a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Default pattern for a unit: `(\d+)\s*<unit>`, case-insensitive. */
export function defaultPatternFor(unit: string): string {
  return `(\\d+)\\s*${escapeRegExp(unit)}`;
}

export function teamPattern(customPattern?: string): string {
  const p = (customPattern ?? "").trim();
  return p || defaultPatternFor(teamUnit());
}

export function cashPattern(customPattern?: string): string {
  const p = (customPattern ?? "").trim();
  return p || defaultPatternFor(cashUnit());
}

export type StoryTag = [string, string | null] | string;

function tagName(t: StoryTag): string {
  return Array.isArray(t) ? t[0] : t;
}

/**
 * Sum the numeric group of every tag matching `pattern` (case-insensitive),
 * mirroring GovKit's `parse_direct_value`. Returns null when nothing matches
 * so the story surfaces as unvalued rather than dropping as zero.
 */
export function parseTaggedNumber(
  tags: readonly StoryTag[] | null | undefined,
  pattern: string,
): number | null {
  if (!pattern) return null;
  let compiled: RegExp;
  try {
    compiled = new RegExp(pattern, "i");
  } catch {
    return null;
  }
  let total = 0;
  let matched = false;
  for (const t of tags ?? []) {
    const m = compiled.exec(tagName(t));
    if (m?.[1] != null && m[1] !== "") {
      const n = Number.parseInt(m[1], 10);
      if (Number.isFinite(n)) {
        total += n;
        matched = true;
      }
    }
  }
  return matched ? total : null;
}

/** Team value (`cook` by default) parsed from story tags. */
export function parseTeamValue(
  tags: readonly StoryTag[] | null | undefined,
  customPattern?: string,
): number | null {
  return parseTaggedNumber(tags, teamPattern(customPattern));
}

/** Cash value (`usd` by default) parsed from story tags. */
export function parseCashValue(
  tags: readonly StoryTag[] | null | undefined,
  customPattern?: string,
): number | null {
  return parseTaggedNumber(tags, cashPattern(customPattern));
}

/** Format one value tag the way `mcp-taiga` writes them: `50cook`, no space. */
export function formatValueTag(value: number, unit: string): string {
  return `${value}${unit}`;
}

export interface ValueTagOptions {
  teamValue?: number | null;
  /** Cash is required at the form level — callers always pass a number (0 allowed). */
  cashValue?: number | null;
  teamUnit?: string;
  cashUnit?: string;
  teamPattern?: string;
  cashPattern?: string;
}

function matchesPattern(name: string, pattern: string): boolean {
  try {
    return new RegExp(pattern, "i").test(name);
  } catch {
    return false;
  }
}

function normalizeCount(n: number | null | undefined): number | null {
  if (n == null) return null;
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}

/**
 * Rewrite the value/cash tags on a story, preserving every other tag (and its
 * color). Exactly one team tag and one cash tag exist afterwards when the
 * corresponding value is non-null; passing null removes that tag.
 */
export function setValueTags(
  existing: readonly [string, string | null][] | null | undefined,
  opts: ValueTagOptions,
): [string, string | null][] {
  const tUnit = opts.teamUnit?.trim() || teamUnit();
  const cUnit = opts.cashUnit?.trim() || cashUnit();
  const tPat = teamPattern(opts.teamPattern);
  const cPat = cashPattern(opts.cashPattern);
  const team = normalizeCount(opts.teamValue);
  const cash = normalizeCount(opts.cashValue);

  const kept = (existing ?? []).filter(([name]) => !matchesPattern(name, tPat) && !matchesPattern(name, cPat));
  if (team != null) kept.push([formatValueTag(team, tUnit), null]);
  if (cash != null) kept.push([formatValueTag(cash, cUnit), null]);
  return kept;
}

/** True when the story carries no team value tag (drives the amber dot). */
export function isMissingValue(
  tags: readonly StoryTag[] | null | undefined,
  customPattern?: string,
): boolean {
  return parseTeamValue(tags, customPattern) == null;
}
