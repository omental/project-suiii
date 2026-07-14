import { describe, expect, it } from "vitest";
import { addDays, daysBetween, formatDhakaDisplayDate, getDhakaDateKey, getDhakaGreeting, getProgrammePosition } from "@/lib/dhakaClock";

describe("dhakaClock", () => {
  it("derives the Dhaka local date instead of the UTC date", () => {
    expect(getDhakaDateKey(new Date("2026-07-14T20:54:00.000Z"))).toBe("2026-07-15");
    expect(formatDhakaDisplayDate("2026-07-15")).toBe("WEDNESDAY 15 JULY");
  });

  it("handles month and year rollover", () => {
    expect(getDhakaDateKey(new Date("2026-07-31T18:30:00.000Z"))).toBe("2026-08-01");
    expect(getDhakaDateKey(new Date("2026-12-31T18:30:00.000Z"))).toBe("2027-01-01");
  });

  it("uses Dhaka-hour greeting boundaries", () => {
    expect(getDhakaGreeting(new Date("2026-07-14T22:59:00.000Z"))).toBe("Still up, champion");
    expect(getDhakaGreeting(new Date("2026-07-14T23:00:00.000Z"))).toBe("Good morning");
    expect(getDhakaGreeting(new Date("2026-07-15T06:00:00.000Z"))).toBe("Good afternoon");
    expect(getDhakaGreeting(new Date("2026-07-15T11:00:00.000Z"))).toBe("Good evening");
  });

  it("calculates calendar programme position", () => {
    expect(getProgrammePosition("2026-07-14", "2026-07-14")).toEqual({ week: 1, day: 1, programmeDay: 1 });
    expect(getProgrammePosition("2026-07-14", "2026-07-20")).toEqual({ week: 1, day: 7, programmeDay: 7 });
    expect(getProgrammePosition("2026-07-14", "2026-07-21")).toEqual({ week: 2, day: 1, programmeDay: 8 });
    expect(daysBetween("2026-12-31", addDays("2026-12-31", 1))).toBe(1);
  });
});
