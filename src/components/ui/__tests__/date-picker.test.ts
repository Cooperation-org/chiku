import { describe, expect, it } from "vitest";
import { parseISODateString, toISODateString } from "@/components/ui/date-picker";

describe("date string helpers", () => {
  it("round-trips YYYY-MM-DD without a UTC shift", () => {
    const d = parseISODateString("2026-09-16");
    expect(d).toBeDefined();
    expect(toISODateString(d!)).toBe("2026-09-16");
    expect([d!.getFullYear(), d!.getMonth(), d!.getDate()]).toEqual([2026, 8, 16]);
  });

  it("returns undefined for blank or invalid input", () => {
    expect(parseISODateString("")).toBeUndefined();
    expect(parseISODateString(null)).toBeUndefined();
    expect(parseISODateString("not-a-date")).toBeUndefined();
  });
});
