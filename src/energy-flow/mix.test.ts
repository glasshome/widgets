import { describe, expect, test } from "bun:test";
import { sourceMix } from "./mix";

describe("sourceMix", () => {
  test("all-zero input yields no shares", () => {
    expect(
      sourceMix([
        { id: "a", watts: 0 },
        { id: "b", watts: 0 },
      ]),
    ).toEqual([]);
  });

  test("fractions sum to 1 across active suppliers", () => {
    const shares = sourceMix([
      { id: "solar", watts: 1200 },
      { id: "battery", watts: 400 },
      { id: "grid", watts: 400 },
    ]);
    const total = shares.reduce((sum, s) => sum + s.fraction, 0);
    expect(total).toBeCloseTo(1);
    expect(shares.map((s) => s.id)).toEqual(["solar", "battery", "grid"]);
    expect(shares[0]?.fraction).toBeCloseTo(0.6);
  });

  test("inactive suppliers are dropped, not zero-width", () => {
    const shares = sourceMix([
      { id: "solar", watts: 800 },
      { id: "battery", watts: 0 },
      { id: "grid", watts: 200 },
    ]);
    expect(shares.map((s) => s.id)).toEqual(["solar", "grid"]);
    expect(shares[0]?.fraction).toBeCloseTo(0.8);
    expect(shares[1]?.fraction).toBeCloseTo(0.2);
  });

  test("single supplier takes the whole bar", () => {
    expect(sourceMix([{ id: "grid", watts: 950 }])).toEqual([
      { id: "grid", watts: 950, fraction: 1 },
    ]);
  });

  test("negative readings clamp to 0", () => {
    expect(
      sourceMix([
        { id: "solar", watts: -30 },
        { id: "battery", watts: 500 },
      ]),
    ).toEqual([{ id: "battery", watts: 500, fraction: 1 }]);
  });
});
