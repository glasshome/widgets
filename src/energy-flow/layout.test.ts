import { describe, expect, test } from "bun:test";
import { beamPath, beamWidth, flowDuration, selectTier } from "./layout";

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
  test("idle power renders the thin minimum hint", () => {
    expect(beamWidth(0, 5000)).toBe(3);
  });

  test("max power caps at the maximum", () => {
    expect(beamWidth(5000, 5000)).toBe(16);
    expect(beamWidth(9999, 5000)).toBe(16);
  });

  test("scales linearly between min and max", () => {
    expect(beamWidth(2500, 5000)).toBeCloseTo(9.5, 5);
  });

  test("guards a zero maxValue", () => {
    expect(beamWidth(100, 0)).toBe(3);
  });
});

describe("flowDuration", () => {
  test("idle power uses the slowest duration", () => {
    expect(flowDuration(0, 5000)).toBe(4);
  });

  test("max power uses the fastest duration", () => {
    expect(flowDuration(5000, 5000)).toBe(2);
  });

  test("clamps within [2, 4]", () => {
    const d = flowDuration(1000, 5000);
    expect(d).toBeGreaterThanOrEqual(2);
    expect(d).toBeLessThanOrEqual(4);
  });

  test("higher power is never slower than lower power", () => {
    expect(flowDuration(3000, 5000)).toBeLessThan(flowDuration(1000, 5000));
  });
});

describe("beamPath", () => {
  test("starts at the from point and ends at the to point", () => {
    const path = beamPath({ x: 10, y: 20 }, { x: 100, y: 80 });
    expect(path.startsWith("M 10 20")).toBe(true);
    expect(path.endsWith("100 80")).toBe(true);
  });

  test("is a single cubic bezier", () => {
    const path = beamPath({ x: 0, y: 0 }, { x: 50, y: 50 });
    expect(path.match(/C/g)?.length).toBe(1);
  });

  test("places both control points at the horizontal midpoint", () => {
    const path = beamPath({ x: 0, y: 0 }, { x: 100, y: 40 });
    // M 0 0 C 50 0 50 40 100 40
    expect(path).toBe("M 0 0 C 50 0 50 40 100 40");
  });
});
