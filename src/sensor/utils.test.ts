import { describe, expect, it } from "bun:test";
import { downsample, readingsWithin, summarize } from "./utils";

describe("readingsWithin", () => {
  it("carries the reading in force at the window start to its left edge", () => {
    const out = readingsWithin(
      [
        { t: 0, value: 10 },
        { t: 50, value: 20 },
        { t: 150, value: 30 },
      ],
      100,
      200,
    );
    expect(out).toEqual([
      { t: 100, value: 20 },
      { t: 150, value: 30 },
    ]);
  });
});

describe("summarize", () => {
  it("weights each reading by how long it held", () => {
    const s = summarize(
      [
        { t: 0, value: 10 },
        { t: 90, value: 20 },
      ],
      100,
    );
    expect(s?.min).toBe(10);
    expect(s?.max).toBe(20);
    expect(s?.average).toBeCloseTo(11);
  });

  it("has nothing to say about no readings", () => {
    expect(summarize([], 100)).toBeUndefined();
  });
});

describe("downsample", () => {
  it("keeps short series as they are and averages long ones into buckets", () => {
    const short = [{ t: 0, value: 1 }];
    expect(downsample(short, 10)).toBe(short);
    const long = Array.from({ length: 100 }, (_, i) => ({ t: i, value: i }));
    const out = downsample(long, 10);
    expect(out).toHaveLength(10);
    expect(out[0]).toEqual({ t: 0, value: 4.5 });
  });
});
