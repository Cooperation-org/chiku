import type { Milestone, UserStory } from "@/lib/api/types";

/** Sprint deadline states for the countdown badge. */
export type SprintUrgency = "none" | "ok" | "warning" | "overdue" | "closed";

/** ms before `estimated_finish` when the badge turns amber (24h). */
export const SPRINT_WARNING_MS = 24 * 60 * 60 * 1000;

/**
 * Pure urgency classifier — unit-tested at the 24h boundary. `nowMs`
 * injectable so tests don't depend on wall clock.
 */
export function getSprintUrgency(
  milestone: Pick<Milestone, "closed" | "estimated_finish"> | null | undefined,
  nowMs: number = Date.now(),
): SprintUrgency {
  if (!milestone) return "none";
  if (milestone.closed) return "closed";
  if (!milestone.estimated_finish) return "none";
  const finish = new Date(milestone.estimated_finish).getTime();
  if (!Number.isFinite(finish)) return "none";
  const left = finish - nowMs;
  if (left <= 0) return "overdue";
  if (left <= SPRINT_WARNING_MS) return "warning";
  return "ok";
}

/** Unfinished stories in a sprint — the rollover set on close. */
export function unfinishedStories(stories: readonly UserStory[], milestoneId: number): UserStory[] {
  return stories.filter((s) => s.milestone === milestoneId && !s.is_closed);
}

/** Stories with no sprint and not closed — the plannable backlog. */
export function backlogStories(stories: readonly UserStory[]): UserStory[] {
  return stories.filter((s) => s.milestone == null && !s.is_closed);
}

/** Open sprints sorted by start date; first is the default rollover target. */
export function openSprintsSorted(milestones: readonly Milestone[]): Milestone[] {
  return milestones
    .filter((m) => !m.closed)
    .sort((a, b) => +new Date(a.estimated_start) - +new Date(b.estimated_start));
}

/** Suggested destination for unfinished work: next open sprint, else backlog (null). */
export function rolloverTarget(
  milestones: readonly Milestone[],
  closingId: number,
): Milestone | null {
  const open = openSprintsSorted(milestones).filter((m) => m.id !== closingId);
  return open[0] ?? null;
}

/** Human countdown: "4d left", "13h left", "Overdue by 2d", "Closed". */
export function formatSprintCountdown(
  milestone: Pick<Milestone, "closed" | "estimated_finish"> | null | undefined,
  nowMs: number = Date.now(),
): string {
  const urgency = getSprintUrgency(milestone, nowMs);
  if (urgency === "closed") return "Closed";
  if (urgency === "none" || !milestone?.estimated_finish) return "No deadline";
  const finish = new Date(milestone.estimated_finish).getTime();
  const diffMs = Math.abs(finish - nowMs);
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const label = days >= 1 ? `${days}d` : `${Math.max(hours, 1)}h`;
  return urgency === "overdue" ? `Overdue by ${label}` : `${label} left`;
}
