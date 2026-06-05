import { describe, expect, test } from "bun:test";
import {
  beamWidth,
  chevronPoints,
  dotDuration,
  dotSchedule,
  NODE_POSITIONS,
  refractedBeamPath,
  selectTier,
} from "./layout";

describe("selectTier", () => {
  test("short heights are glance regardless of width", () => {
    expect(selectTier(800, 120)).toBe("glance");
    expect(selectTier(200, 149)).toBe("glance");
  });

  test("comfortable size is full", () => {
    expect(selectTier(360, 300)).toBe("full");
    expect(selectTier(600, 400)).toBe("full");
  });

  test("in-between is mid", () => {
    expect(selectTier(300, 200)).toBe("mid");
    expect(selectTier(359, 299)).toBe("mid");
  });
});

describe("beamWidth", () => {
  test("zero power renders the thin minimum hint", () => {
    expect(beamWidth(0, 5000)).toBe(3);
  });

  test("max power caps at the maximum", () => {
    expect(beamWidth(5000, 5000)).toBe(14);
    expect(beamWidth(9999, 5000)).toBe(14);
  });

  test("scales linearly between min and max", () => {
    expect(beamWidth(2500, 5000)).toBeCloseTo(8.5, 5);
  });

  test("guards a zero maxValue", () => {
    expect(beamWidth(100, 0)).toBe(3);
  });
});

describe("dotDuration", () => {
  test("zero power uses the slowest duration", () => {
    expect(dotDuration(0, 5000)).toBe(6);
  });

  test("max power uses the fastest duration", () => {
    expect(dotDuration(5000, 5000)).toBe(1.5);
  });

  test("clamps within [1.5, 6]", () => {
    const d = dotDuration(1000, 5000);
    expect(d).toBeGreaterThanOrEqual(1.5);
    expect(d).toBeLessThanOrEqual(6);
  });

  test("higher power is never slower than lower power", () => {
    expect(dotDuration(3000, 5000)).toBeLessThan(dotDuration(1000, 5000));
  });
});

describe("dotSchedule", () => {
  test("no dots for zero flow", () => {
    expect(dotSchedule(0, 4)).toEqual([]);
  });

  test("caps at 3 dots for high power", () => {
    expect(dotSchedule(5000, 3).length).toBe(3);
  });

  test("low power gets a single dot", () => {
    expect(dotSchedule(100, 4).length).toBe(1);
  });

  test("begins are staggered and start at 0", () => {
    const begins = dotSchedule(5000, 6);
    expect(begins[0]).toBe(0);
    expect(begins[1]).toBeCloseTo(2, 5);
    expect(begins[2]).toBeCloseTo(4, 5);
  });
});

describe("refractedBeamPath", () => {
  test("starts at source and ends at home", () => {
    const path = refractedBeamPath(NODE_POSITIONS.solar, NODE_POSITIONS.home);
    expect(path.startsWith(`M ${NODE_POSITIONS.solar.x} ${NODE_POSITIONS.solar.y}`)).toBe(true);
    expect(path.endsWith(`L ${NODE_POSITIONS.home.x} ${NODE_POSITIONS.home.y}`)).toBe(true);
  });

  test("has a single bend (two L segments)", () => {
    const path = refractedBeamPath(NODE_POSITIONS.grid, NODE_POSITIONS.home);
    expect(path.match(/L/g)?.length).toBe(2);
  });
});

describe("chevronPoints", () => {
  test("produces three coordinate pairs", () => {
    const pts = chevronPoints(NODE_POSITIONS.grid, NODE_POSITIONS.home, 0.5);
    expect(pts.split(" ").length).toBe(3);
  });
});
