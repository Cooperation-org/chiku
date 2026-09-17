import type { UserStory, UserStoryStatus } from "@/lib/api/types";

/** One board-column bucket for the story distribution chart. */
export interface StoryStatusRow {
  id: number;
  name: string;
  color: string;
  count: number;
  points: number;
  order: number;
}

/** Project-wide roll-up shown in the story card headers. */
export interface StorySummary {
  total: number;
  open: number;
  closed: number;
  blocked: number;
  backlog: number;
  inSprint: number;
  totalPoints: number;
}

export const STORY_ACTIVITY_WINDOW_DAYS = 28;

function storyPoints(story: UserStory): number {
  return typeof story.total_points === "number" ? story.total_points : 0;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Group stories by board status. Every known status gets a row (even at
 * zero) so the chart always mirrors the board's columns; stories pointing
 * at an unknown status fall into an "Unknown" bucket. Rows are ordered by
 * the status `order` field.
 */
export function groupStoriesByStatus(
  stories: readonly UserStory[],
  statuses: readonly UserStoryStatus[],
): StoryStatusRow[] {
  const byId = new Map<number, StoryStatusRow>();
  for (const status of statuses) {
    byId.set(status.id, {
      id: status.id,
      name: status.name,
      color: status.color,
      count: 0,
      points: 0,
      order: status.order,
    });
  }

  let unknown: StoryStatusRow | null = null;
  for (const story of stories) {
    const row = byId.get(story.status);
    const points = storyPoints(story);
    if (row) {
      row.count += 1;
      row.points += points;
      continue;
    }
    if (!unknown) {
      unknown = {
        id: -1,
        name: story.status_extra_info?.name ?? "Unknown",
        color: story.status_extra_info?.color ?? "#888888",
        count: 0,
        points: 0,
        order: Number.MAX_SAFE_INTEGER,
      };
    }
    unknown.count += 1;
    unknown.points += points;
  }

  const rows = [...byId.values()];
  if (unknown) rows.push(unknown);
  return rows.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/** Roll-up totals for the story card headers. */
export function summarizeStories(stories: readonly UserStory[]): StorySummary {
  let open = 0;
  let closed = 0;
  let blocked = 0;
  let backlog = 0;
  let inSprint = 0;
  let totalPoints = 0;
  for (const story of stories) {
    if (story.is_closed) closed += 1;
    else open += 1;
    if (story.is_blocked) blocked += 1;
    if (story.milestone == null) backlog += 1;
    else inSprint += 1;
    totalPoints += storyPoints(story);
  }
  return {
    total: stories.length,
    open,
    closed,
    blocked,
    backlog,
    inSprint,
    totalPoints,
  };
}

export interface StoryActivity {
  labels: string[];
  open: number[];
  closed: number[];
}

/**
 * Bucket story creation vs completion per day over a trailing window.
 * Opened counts `created_date`; closed counts `modified_date` for stories
 * with `is_closed` (Taiga's list endpoint carries no dedicated closed date,
 * so the copy notes this approximation). Index 0 is the oldest day,
 * matching the issue activity chart's today-backwards window.
 */
export function bucketStoryActivity(
  stories: readonly UserStory[],
  windowDays: number = STORY_ACTIVITY_WINDOW_DAYS,
  now: Date = new Date(),
): StoryActivity {
  const open = new Array<number>(windowDays).fill(0);
  const closed = new Array<number>(windowDays).fill(0);
  const labels: string[] = [];
  const today = startOfDay(now);
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (windowDays - 1 - i));
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }

  function bucketIndex(value: string): number | null {
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) return null;
    const day = startOfDay(new Date(time)).getTime();
    const diff = Math.round((day - today.getTime()) / (24 * 60 * 60 * 1000));
    const index = windowDays - 1 + diff;
    return index >= 0 && index < windowDays ? index : null;
  }

  for (const story of stories) {
    if (story.created_date) {
      const index = bucketIndex(story.created_date);
      if (index != null) open[index] += 1;
    }
    if (story.is_closed && story.modified_date) {
      const index = bucketIndex(story.modified_date);
      if (index != null) closed[index] += 1;
    }
  }

  return { labels, open, closed };
}
