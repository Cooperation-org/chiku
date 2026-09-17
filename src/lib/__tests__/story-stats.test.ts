import { describe, expect, it } from "vitest";
import {
  bucketStoryActivity,
  groupStoriesByStatus,
  summarizeStories,
} from "@/lib/story-stats";
import type { UserStory, UserStoryStatus } from "@/lib/api/types";

function status(over: Partial<UserStoryStatus> = {}): UserStoryStatus {
  return {
    id: 1,
    name: "New",
    slug: "new",
    color: "#aaaaaa",
    is_closed: false,
    order: 1,
    project: 7,
    ...over,
  } as UserStoryStatus;
}

function story(over: Partial<UserStory> = {}): UserStory {
  return {
    id: 1,
    ref: 1,
    status: 1,
    status_extra_info: { name: "New", color: "#aaaaaa", is_closed: false },
    is_closed: false,
    is_blocked: false,
    milestone: null,
    total_points: null,
    created_date: "2026-09-10T10:00:00Z",
    modified_date: "2026-09-10T10:00:00Z",
    ...over,
  } as UserStory;
}

describe("groupStoriesByStatus", () => {
  it("keeps zero-count statuses in board order and sums points", () => {
    const statuses = [
      status({ id: 1, name: "New", order: 2 }),
      status({ id: 2, name: "Ready", order: 1 }),
    ];
    const rows = groupStoriesByStatus(
      [story({ id: 1, status: 1, total_points: 3 }), story({ id: 2, status: 1, total_points: null })],
      statuses,
    );
    expect(rows.map((r) => r.name)).toEqual(["Ready", "New"]);
    expect(rows[1]).toMatchObject({ count: 2, points: 3 });
    expect(rows[0]).toMatchObject({ count: 0, points: 0 });
  });

  it("buckets unknown statuses instead of dropping them", () => {
    const rows = groupStoriesByStatus([story({ status: 99, total_points: 2 })], [status()]);
    expect(rows).toHaveLength(2);
    expect(rows.at(-1)).toMatchObject({ name: "New", count: 1, points: 2 });
  });
});

describe("summarizeStories", () => {
  it("rolls up open/closed, backlog/sprint and points", () => {
    const summary = summarizeStories([
      story({ is_closed: false, milestone: null, total_points: 5 }),
      story({ id: 2, is_closed: true, is_blocked: true, milestone: 3, total_points: 8 }),
    ]);
    expect(summary).toMatchObject({
      total: 2,
      open: 1,
      closed: 1,
      blocked: 1,
      backlog: 1,
      inSprint: 1,
      totalPoints: 13,
    });
  });
});

describe("bucketStoryActivity", () => {
  const now = new Date("2026-09-16T12:00:00");

  it("counts created vs closed-modified per day, oldest first", () => {
    const activity = bucketStoryActivity(
      [
        story({ created_date: "2026-09-16T08:00:00", modified_date: "2026-09-16T08:00:00" }),
        story({
          id: 2,
          is_closed: true,
          created_date: "2026-09-14T08:00:00",
          modified_date: "2026-09-15T08:00:00",
        }),
      ],
      3,
      now,
    );
    expect(activity.labels).toHaveLength(3);
    // Window is 9/14, 9/15, 9/16.
    expect(activity.open).toEqual([1, 0, 1]);
    expect(activity.closed).toEqual([0, 1, 0]);
  });

  it("ignores open stories for closed counts and skips bad dates", () => {
    const activity = bucketStoryActivity(
      [story({ created_date: "not-a-date", modified_date: "also-bad" })],
      3,
      now,
    );
    expect(activity.open).toEqual([0, 0, 0]);
    expect(activity.closed).toEqual([0, 0, 0]);
  });
});
