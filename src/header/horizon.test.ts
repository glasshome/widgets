import { describe, expect, test } from "bun:test";
import { arcPath, dayProgress, type SunTimes, sunWindow } from "./horizon";

const sunrise = new Date("2026-09-03T06:00:00Z");
const sunset = new Date("2026-09-03T18:00:00Z");
const times: SunTimes = { sunrise, sunset };

describe("dayProgress", () => {
  test("noon sits at the middle of the arc", () => {
    expect(dayProgress(new Date("2026-09-03T12:00:00Z"), times)).toBeCloseTo(0.5, 5);
  });

  test("sunrise and sunset are the ends", () => {
    expect(dayProgress(sunrise, times)).toBe(0);
    expect(dayProgress(sunset, times)).toBe(1);
  });

  test("night clamps to the nearest end", () => {
    expect(dayProgress(new Date("2026-09-03T03:00:00Z"), times)).toBe(0);
    expect(dayProgress(new Date("2026-09-03T23:00:00Z"), times)).toBe(1);
  });

  test("a broken sun entity has no progress", () => {
    expect(dayProgress(new Date(), { sunrise: null, sunset: null })).toBeNull();
    expect(
      dayProgress(new Date(), { sunrise: sunset, sunset: sunrise }),
    ).toBeNull();
  });
});

describe("arcPath", () => {
  test("spans the given width and dips to the given height", () => {
    const d = arcPath(100, 20);
    expect(d.startsWith("M 0 20")).toBe(true);
    expect(d).toContain("100");
  });
});

const DAY = 24 * 60 * 60 * 1000;

describe("sunWindow", () => {
  test("by day, sunrise is the one that already happened", () => {
    // 14:00: today's sunset is next, tomorrow's sunrise is next_rising.
    const w = sunWindow("above_horizon", "2026-09-04T06:00:00Z", "2026-09-03T18:00:00Z");
    expect(w.sunrise?.toISOString()).toBe("2026-09-03T06:00:00.000Z");
    expect(w.sunset?.toISOString()).toBe("2026-09-03T18:00:00.000Z");
  });

  test("before dawn, both times are today's", () => {
    const w = sunWindow(
      "below_horizon",
      "2026-09-03T06:00:00Z",
      "2026-09-03T18:00:00Z",
      new Date("2026-09-03T03:00:00Z"),
    );
    expect(w.sunrise?.toISOString()).toBe("2026-09-03T06:00:00.000Z");
    expect(w.sunset?.toISOString()).toBe("2026-09-03T18:00:00.000Z");
  });

  test("after dusk, the window is the day that just ended", () => {
    const w = sunWindow(
      "below_horizon",
      "2026-09-04T06:00:00Z",
      "2026-09-04T18:00:00Z",
      new Date("2026-09-03T22:00:00Z"),
    );
    expect(w.sunrise?.toISOString()).toBe("2026-09-03T06:00:00.000Z");
    expect(w.sunset?.toISOString()).toBe("2026-09-03T18:00:00.000Z");
  });

  test("a missing or unparseable attribute gives no window", () => {
    expect(sunWindow("above_horizon", undefined, "2026-09-03T18:00:00Z").sunrise).toBeNull();
    expect(sunWindow("above_horizon", "nonsense", "2026-09-03T18:00:00Z").sunset).toBeNull();
  });

  test("the window it returns is always usable by dayProgress", () => {
    const byDay = sunWindow("above_horizon", "2026-09-04T06:00:00Z", "2026-09-03T18:00:00Z");
    expect(dayProgress(new Date("2026-09-03T12:00:00Z"), byDay)).toBeCloseTo(0.5, 5);
    const afterDusk = sunWindow(
      "below_horizon",
      "2026-09-04T06:00:00Z",
      "2026-09-04T18:00:00Z",
      new Date("2026-09-03T22:00:00Z"),
    );
    expect(dayProgress(new Date("2026-09-03T22:00:00Z"), afterDusk)).toBe(1);
    expect(DAY).toBe(86400000);
  });
});
