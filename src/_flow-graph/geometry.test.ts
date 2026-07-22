import { describe, expect, test } from "bun:test";
import { ribbonPath, stackLanes } from "./geometry";

describe("ribbonPath", () => {
  test("is a closed shape with two mirrored cubics", () => {
    const d = ribbonPath({ x: 0, top: 0, bottom: 10 }, { x: 100, top: 40, bottom: 50 });
    expect(d.startsWith("M 0 0")).toBe(true);
    expect(d.trim().endsWith("Z")).toBe(true);
    expect(d.split("C").length - 1).toBe(2);
  });

  test("a thin band draws a hairline ribbon (same function, no special case)", () => {
    const d = ribbonPath({ x: 0, top: 49, bottom: 51 }, { x: 100, top: 49, bottom: 51 });
    expect(d.startsWith("M 0 49")).toBe(true);
    expect(d.trim().endsWith("Z")).toBe(true);
  });
});

describe("stackLanes", () => {
  const opts = { minWidth: 4, activeFraction: 0.8 };

  test("splits two equal weights evenly, centered", () => {
    const bands = stackLanes(
      [
        { id: "a", weight: 1000 },
        { id: "b", weight: 1000 },
      ],
      50,
      100,
      opts,
    );
    // fullH = 80, each lane = 40, total = 80, centered on 50 -> starts at 10.
    expect(bands.get("a")).toEqual({ top: 10, bottom: 50 });
    expect(bands.get("b")).toEqual({ top: 50, bottom: 90 });
  });

  test("scales width by weight share", () => {
    const bands = stackLanes(
      [
        { id: "a", weight: 750 },
        { id: "b", weight: 250 },
      ],
      50,
      100,
      opts,
    );
    const a = bands.get("a");
    const b = bands.get("b");
    expect((a?.bottom ?? 0) - (a?.top ?? 0)).toBeCloseTo(60);
    expect((b?.bottom ?? 0) - (b?.top ?? 0)).toBeCloseTo(20);
  });

  test("floors a near-zero weight to minWidth (the old idle hint)", () => {
    const bands = stackLanes([{ id: "i", weight: 0 }], 50, 100, opts);
    const i = bands.get("i");
    expect((i?.bottom ?? 0) - (i?.top ?? 0)).toBe(4);
  });

  test("caps a lane at its max", () => {
    const bands = stackLanes([{ id: "a", weight: 9999, max: 12 }], 50, 100, opts);
    const a = bands.get("a");
    expect((a?.bottom ?? 0) - (a?.top ?? 0)).toBe(12);
  });

  test("preserves input order without crossing", () => {
    const bands = stackLanes(
      [
        { id: "a", weight: 100 },
        { id: "b", weight: 100 },
        { id: "c", weight: 100 },
      ],
      50,
      120,
      opts,
    );
    const tops = ["a", "b", "c"].map((id) => bands.get(id)?.top ?? 0);
    expect(tops[0]).toBeLessThan(tops[1]);
    expect(tops[1]).toBeLessThan(tops[2]);
  });

  test("empty input yields an empty map", () => {
    expect(stackLanes([], 50, 100, opts).size).toBe(0);
  });

  test("all-zero stack does not divide by zero (every lane floored)", () => {
    const bands = stackLanes(
      [
        { id: "a", weight: 0 },
        { id: "b", weight: 0 },
      ],
      50,
      100,
      opts,
    );
    // total = 2 * minWidth = 8, centered on 50 -> [46,50],[50,54].
    expect(bands.get("a")).toEqual({ top: 46, bottom: 50 });
    expect(bands.get("b")).toEqual({ top: 50, bottom: 54 });
  });
});
