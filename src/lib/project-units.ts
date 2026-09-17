/**
 * Per-venture (project) pie-slicing value units.
 *
 * Standard (mcp-taiga / GovKit): the value unit is configuration, not
 * architecture. Each venture names its own team + cash units — `cook` / `usd`
 * are just the defaults. A venture that sets nothing gets the defaults.
 *
 * Storage: Taiga projects have no dedicated field for this, so units live in
 * the project's own tag list (shared, admin-written via `updateProject`,
 * same mechanism as the `archived` tag):
 * - `value-team:slices` → team unit
 * - `value-cash:eur`    → cash unit
 *
 * Story tags keep the `{number}{unit}` shape (`50slices`, `100eur`), so
 * GovKit's sync and `mcp-taiga` (`TAG_TEAM` / `TAG_CASH`) need no change.
 */

import { useMemo } from "react";
import { useProjects } from "@/lib/queries/projects";
import {
  cashUnit as globalCashUnit,
  DEFAULT_CASH_UNIT,
  DEFAULT_TEAM_UNIT,
  parseCashValue as parseCashWith,
  parseTeamValue as parseTeamWith,
  setValueTags as setGlobalValueTags,
  teamUnit as globalTeamUnit,
} from "@/lib/values";

export interface ProjectUnits {
  team: string;
  cash: string;
}

/** A project tag carrying a unit, e.g. `value-team:slices`. */
const TEAM_TAG_RE = /^value-team:(.+)$/i;
const CASH_TAG_RE = /^value-cash:(.+)$/i;

/** Units are written into story tags — keep them tag-safe and short. */
const UNIT_RE = /^[a-z0-9$.-]{1,16}$/i;

export function normalizeUnit(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const unit = raw.trim().toLowerCase();
  return UNIT_RE.test(unit) ? unit : null;
}

function lastTagUnit(tags: readonly string[] | null | undefined, re: RegExp): string | null {
  let found: string | null = null;
  for (const t of tags ?? []) {
    const m = re.exec(t.trim());
    if (m) {
      const unit = normalizeUnit(m[1]);
      if (unit) found = unit;
    }
  }
  return found;
}

/**
 * Resolve a venture's units. Missing/invalid tags fall back to the
 * deployment env (`VITE_VALUE_UNIT` / `VITE_CASH_UNIT`) and then to
 * `cook` / `usd` — a venture with nothing set up always gets cook/usd.
 */
export function getProjectUnits(
  project: { tags?: readonly string[] | null } | null | undefined,
): ProjectUnits {
  return {
    team: lastTagUnit(project?.tags, TEAM_TAG_RE) ?? globalTeamUnit(),
    cash: lastTagUnit(project?.tags, CASH_TAG_RE) ?? globalCashUnit(),
  };
}

/** True when the project carries no unit tags at all (pure defaults). */
export function hasCustomUnits(project: { tags?: readonly string[] | null } | null | undefined): boolean {
  const tags = project?.tags ?? [];
  return tags.some((t) => TEAM_TAG_RE.test(t.trim()) || CASH_TAG_RE.test(t.trim()));
}

/**
 * Build the next project tag list with the given units applied.
 * Units equal to the global defaults are omitted (absence == default),
 * so resetting to cook/usd simply removes the tags.
 */
export function buildProjectUnitTags(
  existing: readonly string[] | null | undefined,
  units: { team?: string | null; cash?: string | null },
): string[] {
  const team = units.team?.trim().toLowerCase() || "";
  const cash = units.cash?.trim().toLowerCase() || "";
  const kept = (existing ?? []).filter(
    (t) => !TEAM_TAG_RE.test(t.trim()) && !CASH_TAG_RE.test(t.trim()),
  );
  const defaultTeam = globalTeamUnit().toLowerCase();
  const defaultCash = globalCashUnit().toLowerCase();
  if (team && team !== defaultTeam) kept.push(`value-team:${team}`);
  if (cash && cash !== defaultCash) kept.push(`value-cash:${cash}`);
  return [...kept];
}

/** Reactive units for a project id — reads the cached project list. */
export function useProjectUnits(projectId: number | null | undefined): ProjectUnits {
  const { data: projects } = useProjects();
  return useMemo(() => {
    const project = projectId != null ? projects?.find((p) => p.id === projectId) : undefined;
    return getProjectUnits(project);
  }, [projects, projectId]);
}

// --- Story-tag helpers: unit-aware with legacy default fallback --------------
// Renaming a venture's unit must not orphan old `50cook` story tags, so reads
// try the venture unit first and then the global default; writes strip both
// patterns and emit only the venture unit.

export function parseProjectTeamValue(
  tags: readonly [string, string | null][] | readonly string[] | null | undefined,
  units: ProjectUnits,
): number | null {
  const tagsArg = tags as Parameters<typeof parseTeamWith>[0];
  return (
    parseTeamWith(tagsArg, undefined, units.team) ??
    (units.team.toLowerCase() === DEFAULT_TEAM_UNIT.toLowerCase()
      ? null
      : parseTeamWith(tagsArg))
  );
}

export function parseProjectCashValue(
  tags: readonly [string, string | null][] | readonly string[] | null | undefined,
  units: ProjectUnits,
): number | null {
  const tagsArg = tags as Parameters<typeof parseCashWith>[0];
  return (
    parseCashWith(tagsArg, undefined, units.cash) ??
    (units.cash.toLowerCase() === DEFAULT_CASH_UNIT.toLowerCase()
      ? null
      : parseCashWith(tagsArg))
  );
}

export function isProjectValueMissing(
  tags: readonly [string, string | null][] | readonly string[] | null | undefined,
  units: ProjectUnits,
): boolean {
  return parseProjectTeamValue(tags, units) == null;
}

export function setProjectValueTags(
  existing: readonly [string, string | null][] | null | undefined,
  opts: { teamValue?: number | null; cashValue?: number | null; units: ProjectUnits },
): [string, string | null][] {
  const { units } = opts;
  // First pass writes venture-unit tags (stripping venture-unit matches).
  const next = setGlobalValueTags(existing, {
    teamValue: opts.teamValue,
    cashValue: opts.cashValue,
    teamUnit: units.team,
    cashUnit: units.cash,
  });
  // Second pass strips any leftover global-default tags when the venture
  // renamed its units (a no-op when units are the defaults).
  if (units.team.toLowerCase() === DEFAULT_TEAM_UNIT.toLowerCase()) return next;
  return setGlobalValueTags(next, {
    teamValue: null,
    cashValue: null,
  });
}
