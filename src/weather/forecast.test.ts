import { describe, expect, it } from "bun:test";
import { skyChanges, smoothPath, upcomingHours, weekRange } from "./forecast";

const hours = (conditions: string[], start = Date.UTC(2026, 8, 23, 12)) =>
  conditions.map((condition, i) => ({
    datetime: new Date(start + i * 3600_000).toISOString(),
    condition,
  }));

describe("skyChanges", () => {
  it("marks the first hour and every hour the sky turns", () => {
    expect(skyChanges(hours(["sunny", "sunny", "rainy", "pouring", "partlycloudy"]))).toEqual([
      0, 2, 4,
    ]);
  });

  it("treats a clear day running into a clear night as one sky", () => {
    expect(skyChanges(hours(["sunny", "clear-night", "clear-night"]))).toEqual([0]);
  });
});

describe("smoothPath", () => {
  it("starts at the first point and ends at the last", () => {
    const d = smoothPath([
      { x: 0, y: 10 },
      { x: 50, y: 0 },
      { x: 100, y: 20 },
    ]);
    expect(d.startsWith("M0.00,10.00")).toBe(true);
    expect(d.endsWith("100.00,20.00")).toBe(true);
  });
});

describe("upcomingHours", () => {
  it("drops hours that have passed", () => {
    const list = hours(["a", "b", "c", "d"]);
    const now = new Date(Date.UTC(2026, 8, 23, 14, 30));
    expect(upcomingHours(list, now).map((h) => h.condition)).toEqual(["c", "d"]);
  });
});

describe("weekRange", () => {
  it("spans the coldest low to the warmest high", () => {
    expect(
      weekRange([
        { datetime: "", temp_high: 20, temp_low: 11 },
        { datetime: "", temperature: 24, temp_low: 9 },
      ]),
    ).toEqual({ min: 9, max: 24 });
  });
});
