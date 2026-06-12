import { describe, expect, test } from "bun:test";
import { sourceMix } from "./mix";

describe("sourceMix", () => {
  test("all-zero input yields no shares", () => {
    expect(sourceMix({ solarW: 0, batteryW: 0, gridW: 0 })).toEqual([]);
  });

  test("fractions sum to 1 across active sources", () => {
    const shares = sourceMix({ solarW: 1200, batteryW: 400, gridW: 400 });
    const total = shares.reduce((sum, s) => sum + s.fraction, 0);
    expect(total).toBeCloseTo(1);
    expect(shares.map((s) => s.role)).toEqual(["solar", "battery", "grid"]);
    expect(shares[0]?.fraction).toBeCloseTo(0.6);
  });

  test("inactive sources are dropped, not zero-width", () => {
    const shares = sourceMix({ solarW: 800, batteryW: 0, gridW: 200 });
    expect(shares.map((s) => s.role)).toEqual(["solar", "grid"]);
    expect(shares[0]?.fraction).toBeCloseTo(0.8);
    expect(shares[1]?.fraction).toBeCloseTo(0.2);
  });

  test("single source takes the whole bar", () => {
    const shares = sourceMix({ solarW: 0, batteryW: 0, gridW: 950 });
    expect(shares).toEqual([{ role: "grid", watts: 950, fraction: 1 }]);
  });

  test("negative readings clamp to 0", () => {
    const shares = sourceMix({ solarW: -30, batteryW: 500, gridW: 0 });
    expect(shares).toEqual([{ role: "battery", watts: 500, fraction: 1 }]);
  });
});
