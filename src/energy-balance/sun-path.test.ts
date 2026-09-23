import { describe, expect, it } from "bun:test";
import { arcPoint, skyProgress } from "./sun-path";

const at = (h: number, m = 0) => new Date(2026, 8, 23, h, m);

describe("skyProgress", () => {
  it("walks the sun across the day", () => {
    expect(skyProgress(at(6), true)).toEqual({ body: "sun", t: 0 });
    expect(skyProgress(at(12), true)).toEqual({ body: "sun", t: 0.5 });
  });

  it("keeps a long summer evening's sun on the horizon, never the moon", () => {
    expect(skyProgress(at(19, 40), true)).toEqual({ body: "sun", t: 1 });
  });

  it("follows Home Assistant's progress when it has one", () => {
    expect(skyProgress(at(9), true, 0.8)).toEqual({ body: "sun", t: 0.8 });
  });

  it("puts the moon up only at night, across midnight", () => {
    expect(skyProgress(at(18), false)).toEqual({ body: "moon", t: 0 });
    expect(skyProgress(at(0), false)).toEqual({ body: "moon", t: 0.5 });
  });
});

describe("arcPoint", () => {
  it("rises from the left horizon to the apex and sets on the right", () => {
    const box = { width: 300, height: 200 };
    const left = arcPoint(0, box);
    const top = arcPoint(0.5, box);
    const right = arcPoint(1, box);
    expect(left.y).toBeCloseTo(right.y, 5);
    expect(top.y).toBeLessThan(left.y);
    expect(top.x).toBeCloseTo(150, 5);
    expect(left.x).toBeLessThan(top.x);
    expect(right.x).toBeGreaterThan(top.x);
  });
});
