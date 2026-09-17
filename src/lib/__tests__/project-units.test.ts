import { describe, expect, it } from "vitest";
import {
  buildProjectUnitTags,
  getProjectUnits,
  hasCustomUnits,
  normalizeUnit,
  parseProjectCashValue,
  parseProjectTeamValue,
  setProjectValueTags,
} from "@/lib/project-units";

describe("project units", () => {
  it("defaults to cook/usd when the venture sets nothing", () => {
    expect(getProjectUnits(null)).toEqual({ team: "cook", cash: "usd" });
    expect(getProjectUnits({ tags: [] })).toEqual({ team: "cook", cash: "usd" });
    expect(getProjectUnits({ tags: ["archived", "frontend"] })).toEqual({
      team: "cook",
      cash: "usd",
    });
  });

  it("reads value-team / value-cash project tags", () => {
    expect(
      getProjectUnits({ tags: ["value-team:slices", "value-cash:eur"] }),
    ).toEqual({ team: "slices", cash: "eur" });
  });

  it("is case-insensitive and lets the last tag win", () => {
    expect(
      getProjectUnits({ tags: ["VALUE-TEAM:Points", "value-team:slices"] }),
    ).toMatchObject({ team: "slices" });
  });

  it("ignores malformed unit tags and falls back to defaults", () => {
    expect(getProjectUnits({ tags: ["value-team:", "value-cash:!!!"] })).toEqual({
      team: "cook",
      cash: "usd",
    });
  });

  it("detects custom units", () => {
    expect(hasCustomUnits({ tags: ["value-team:slices"] })).toBe(true);
    expect(hasCustomUnits({ tags: ["archived"] })).toBe(false);
    expect(hasCustomUnits(null)).toBe(false);
  });

  it("rejects unsafe unit names", () => {
    expect(normalizeUnit("slices")).toBe("slices");
    expect(normalizeUnit(" EUR ")).toBe("eur");
    expect(normalizeUnit("a b")).toBeNull();
    expect(normalizeUnit("")).toBeNull();
    expect(normalizeUnit(null)).toBeNull();
  });

  it("builds project tags, omitting defaults", () => {
    // Custom units are written…
    expect(buildProjectUnitTags(["archived"], { team: "slices", cash: "eur" })).toEqual([
      "archived",
      "value-team:slices",
      "value-cash:eur",
    ]);
    // …defaults are absence, and old unit tags are replaced, not doubled.
    expect(
      buildProjectUnitTags(["archived", "value-team:slices", "value-cash:eur"], {
        team: "cook",
        cash: "usd",
      }),
    ).toEqual(["archived"]);
  });

  it("reads story tags in the venture unit, falling back to legacy cook/usd", () => {
    const units = { team: "slices", cash: "eur" };
    expect(parseProjectTeamValue([["30slices", null]], units)).toBe(30);
    expect(parseProjectTeamValue([["50cook", null]], units)).toBe(50);
    expect(parseProjectCashValue([["100eur", null]], units)).toBe(100);
    expect(parseProjectCashValue([["100usd", null]], units)).toBe(100);
    expect(parseProjectTeamValue([["frontend", null]], units)).toBeNull();
  });

  it("writes venture-unit story tags and strips legacy default tags", () => {
    const units = { team: "slices", cash: "eur" };
    expect(
      setProjectValueTags(
        [
          ["50cook", null],
          ["100usd", null],
          ["bug", "#123"],
        ],
        { teamValue: 30, cashValue: 0, units },
      ),
    ).toEqual([
      ["bug", "#123"],
      ["30slices", null],
      ["0eur", null],
    ]);
  });
});
