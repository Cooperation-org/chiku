import { describe, expect, it } from "vitest";
import {
  backlogStories,
  formatSprintCountdown,
  getSprintUrgency,
  openSprintsSorted,
  rolloverTarget,
  unfinishedStories,
  SPRINT_WARNING_MS,
} from "@/lib/sprints";
import type { Milestone, UserStory } from "@/lib/api/types";

const H = 60 * 60 * 1000;
const NOW = new Date("2026-09-16T12:00:00Z").getTime();

function sprint(over: Partial<Milestone> = {}): Pick<Milestone, "closed" | "estimated_finish"> {
  return { closed: false, estimated_finish: "2026-09-20", ...over } as Pick<
    Milestone,
    "closed" | "estimated_finish"
  >;
}

describe("getSprintUrgency", () => {
  it("is ok more than 24h out, warning within 24h", () => {
    expect(getSprintUrgency(sprint({ estimated_finish: new Date(NOW + SPRINT_WARNING_MS + 1000).toISOString() }), NOW)).toBe("ok");
    expect(getSprintUrgency(sprint({ estimated_finish: new Date(NOW + SPRINT_WARNING_MS - 1000).toISOString() }), NOW)).toBe("warning");
  });

  it("is overdue past the deadline and closed when closed", () => {
    expect(getSprintUrgency(sprint({ estimated_finish: new Date(NOW - H).toISOString() }), NOW)).toBe("overdue");
    expect(getSprintUrgency(sprint({ closed: true, estimated_finish: new Date(NOW - H).toISOString() }), NOW)).toBe("closed");
  });

  it("is none without a milestone or deadline", () => {
    expect(getSprintUrgency(null, NOW)).toBe("none");
    expect(getSprintUrgency(sprint({ estimated_finish: "" }), NOW)).toBe("none");
    expect(getSprintUrgency(sprint({ estimated_finish: "not-a-date" }), NOW)).toBe("none");
  });
});

describe("formatSprintCountdown", () => {
  it("formats days, hours, overdue and closed", () => {
    expect(formatSprintCountdown(sprint({ estimated_finish: new Date(NOW + 4 * 24 * H).toISOString() }), NOW)).toBe("4d left");
    expect(formatSprintCountdown(sprint({ estimated_finish: new Date(NOW + 13 * H).toISOString() }), NOW)).toBe("13h left");
    expect(formatSprintCountdown(sprint({ estimated_finish: new Date(NOW - 2 * 24 * H).toISOString() }), NOW)).toBe("Overdue by 2d");
    expect(formatSprintCountdown(sprint({ closed: true }), NOW)).toBe("Closed");
  });
});

function story(over: Partial<UserStory> = {}): UserStory {
  return { id: 1, milestone: null, is_closed: false, ...over } as UserStory;
}
function milestone(id: number, over: Partial<Milestone> = {}): Milestone {
  return {
    id,
    closed: false,
    estimated_start: "2026-09-01",
    estimated_finish: "2026-09-20",
    ...over,
  } as Milestone;
}

describe("sprint sets", () => {
  const stories = [
    story({ id: 1, milestone: 7 }),
    story({ id: 2, milestone: 7, is_closed: true }),
    story({ id: 3, milestone: 8 }),
    story({ id: 4, milestone: null }),
    story({ id: 5, milestone: null, is_closed: true }),
  ];

  it("unfinishedStories excludes closed work", () => {
    expect(unfinishedStories(stories, 7).map((s) => s.id)).toEqual([1]);
  });

  it("backlogStories are unassigned and open", () => {
    expect(backlogStories(stories).map((s) => s.id)).toEqual([4]);
  });

  it("rollover target is the next open sprint, else backlog", () => {
    const sprints = [milestone(7), milestone(8, { estimated_start: "2026-09-10" }), milestone(9, { closed: true })];
    expect(openSprintsSorted(sprints).map((m) => m.id)).toEqual([7, 8]);
    expect(rolloverTarget(sprints, 7)?.id).toBe(8);
    expect(rolloverTarget([milestone(7)], 7)).toBeNull();
  });
});
