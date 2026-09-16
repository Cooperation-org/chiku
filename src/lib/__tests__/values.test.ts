import { describe, expect, it } from "vitest";
import {
  cashPattern,
  formatValueTag,
  isMissingValue,
  parseCashValue,
  parseTaggedNumber,
  parseTeamValue,
  setValueTags,
  teamPattern,
} from "@/lib/values";

describe("value tags", () => {
  it("parses and sums matching tags case-insensitively", () => {
    expect(parseTeamValue([["5 cook", null], ["3COOK", null]])).toBe(8);
    expect(parseTeamValue([["5cook", null]])).toBe(5);
    expect(parseTeamValue([])).toBeNull();
    expect(parseTeamValue(null)).toBeNull();
  });

  it("ignores non-matching tags and returns null when nothing matches", () => {
    expect(parseTeamValue([["frontend", null], ["3 priority", null]])).toBeNull();
  });

  it("returns null for an invalid pattern instead of throwing", () => {
    expect(parseTaggedNumber([["5 cook", null]], "(\\d+")).toBeNull();
    expect(parseTaggedNumber([["5 cook", null]], "")).toBeNull();
  });

  it("defaults to cook/usd patterns unless a custom pattern is given", () => {
    expect(teamPattern()).toContain("cook");
    expect(cashPattern()).toContain("usd");
    expect(teamPattern("(\\d+)\\s*points")).toContain("points");
  });

  it("parses cash separately from team value", () => {
    const tags: [string, string | null][] = [
      ["50cook", null],
      ["100usd", null],
    ];
    expect(parseTeamValue(tags)).toBe(50);
    expect(parseCashValue(tags)).toBe(100);
  });

  it("formats tags without a space, like mcp-taiga", () => {
    expect(formatValueTag(50, "cook")).toBe("50cook");
    expect(formatValueTag(0, "usd")).toBe("0usd");
  });

  it("replaces old value tags while preserving other tags and colors", () => {
    const next = setValueTags(
      [
        ["frontend", "#123"],
        ["50cook", null],
        ["100usd", null],
      ],
      { teamValue: 75, cashValue: 0 },
    );
    expect(next).toEqual([
      ["frontend", "#123"],
      ["75cook", null],
      ["0usd", null],
    ]);
  });

  it("removes a value tag when null is passed", () => {
    const next = setValueTags([["50cook", null], ["bug", null]], {
      teamValue: null,
      cashValue: 10,
    });
    expect(next).toEqual([
      ["bug", null],
      ["10usd", null],
    ]);
  });

  it("rejects negative or non-finite values", () => {
    const next = setValueTags([], { teamValue: -5, cashValue: Number.NaN });
    expect(next).toEqual([]);
  });

  it("detects missing value for the badge", () => {
    expect(isMissingValue([["frontend", null]])).toBe(true);
    expect(isMissingValue([["5cook", null]])).toBe(false);
  });
});
