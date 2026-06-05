import { describe, expect, test } from "bun:test";
import { calculateHomeConsumption, normalizeBidirectional } from "./calculations";

describe("normalizeBidirectional", () => {
  test("import/export shape passes through", () => {
    expect(normalizeBidirectional({ importValue: 300, exportValue: 50 })).toEqual({
      import: 300,
      export: 50,
    });
  });

  test("import/export clamps negatives to 0", () => {
    expect(normalizeBidirectional({ importValue: -10, exportValue: -5 })).toEqual({
      import: 0,
      export: 0,
    });
  });

  test("signed positive maps to import", () => {
    expect(normalizeBidirectional({ signed: 400 })).toEqual({ import: 400, export: 0 });
  });

  test("signed negative maps to export (abs)", () => {
    expect(normalizeBidirectional({ signed: -250 })).toEqual({ import: 0, export: 250 });
  });

  test("signed zero reads as 0 on both sides", () => {
    expect(normalizeBidirectional({ signed: 0 })).toEqual({ import: 0, export: 0 });
    expect(normalizeBidirectional({ signed: -0 })).toEqual({ import: 0, export: 0 });
  });
});

describe("calculateHomeConsumption", () => {
  test("entity strategy returns homeW", () => {
    expect(calculateHomeConsumption("entity", { homeW: 1200 })).toBe(1200);
  });

  test("entity strategy defaults missing homeW to 0", () => {
    expect(calculateHomeConsumption("entity", {})).toBe(0);
  });

  test("grid_plus_solar: grid import + solar", () => {
    // grid imports 500, solar 800, no battery → 1300
    const result = calculateHomeConsumption("grid_plus_solar", {
      grid: { signed: 500 },
      solarW: 800,
    });
    expect(result).toBe(1300);
  });

  test("grid_plus_solar: exporting reduces consumption", () => {
    // solar 2000, grid exporting 500 (signed -500) → 2000 - 500 = 1500
    const result = calculateHomeConsumption("grid_plus_solar", {
      grid: { signed: -500 },
      solarW: 2000,
    });
    expect(result).toBe(1500);
  });

  test("grid_plus_solar: battery charge subtracts, discharge adds", () => {
    // grid import 0, solar 3000, battery charging 1000 (import side) → 3000 - 1000 = 2000
    const charging = calculateHomeConsumption("grid_plus_solar", {
      solarW: 3000,
      battery: { importValue: 1000, exportValue: 0 },
    });
    expect(charging).toBe(2000);
    // battery discharging 1000 (export side), grid import 200 → 200 + 1000 = 1200
    const discharging = calculateHomeConsumption("grid_plus_solar", {
      grid: { signed: 200 },
      battery: { importValue: 0, exportValue: 1000 },
    });
    expect(discharging).toBe(1200);
  });

  test("grid_plus_solar: floors negative jitter at 0", () => {
    // solar 100, grid exporting 200 → -100 → floored to 0
    const result = calculateHomeConsumption("grid_plus_solar", {
      grid: { signed: -200 },
      solarW: 100,
    });
    expect(result).toBe(0);
  });

  test("grid_plus_solar: missing fields default to 0", () => {
    expect(calculateHomeConsumption("grid_plus_solar", {})).toBe(0);
  });

  test("sum_consumers sums the array", () => {
    expect(calculateHomeConsumption("sum_consumers", { consumersW: [100, 200, 50] })).toBe(350);
  });

  test("sum_consumers defaults missing array to 0", () => {
    expect(calculateHomeConsumption("sum_consumers", {})).toBe(0);
  });
});
