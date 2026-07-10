import { describe, expect, test } from "bun:test";
import type { FlowState } from "../_energy-shared/formatting";
import { computeCost } from "./cost";

const tariff = { currency: "€", rate: 0.3 };

describe("computeCost tariff gating", () => {
  const state: FlowState = { gridImportW: 2000 };

  test("null when currency is missing", () => {
    expect(computeCost(state, { rate: 0.3 })).toBeNull();
  });

  test("null when currency is blank", () => {
    expect(computeCost(state, { currency: "  ", rate: 0.3 })).toBeNull();
  });

  test("null when rate is missing", () => {
    expect(computeCost(state, { currency: "€" })).toBeNull();
  });

  test("null when rate is zero or negative", () => {
    expect(computeCost(state, { currency: "€", rate: 0 })).toBeNull();
    expect(computeCost(state, { currency: "€", rate: -1 })).toBeNull();
  });

  test("keeps the currency symbol verbatim", () => {
    expect(computeCost(state, { currency: "kr", rate: 0.3 })?.currency).toBe("kr");
  });
});

describe("computeCost grid rate", () => {
  test("importing costs (positive)", () => {
    // 2 kW * €0.30 = €0.60/h
    expect(computeCost({ gridImportW: 2000 }, tariff)?.gridPerHour).toBeCloseTo(0.6);
  });

  test("exporting earns (negative)", () => {
    // -1.5 kW * €0.30 = -€0.45/h
    expect(computeCost({ gridExportW: 1500 }, tariff)?.gridPerHour).toBeCloseTo(-0.45);
  });

  test("net of simultaneous import and export", () => {
    const c = computeCost({ gridImportW: 2000, gridExportW: 500 }, tariff);
    expect(c?.gridPerHour).toBeCloseTo(0.45);
  });
});

describe("computeCost solar saving", () => {
  test("self-consumed solar is priced at the tariff", () => {
    // 3 kW solar, 1 kW exported -> 2 kW self-consumed * €0.30 = €0.60/h
    const c = computeCost({ solarW: 3000, gridExportW: 1000 }, tariff);
    expect(c?.solarSavingPerHour).toBeCloseTo(0.6);
  });

  test("all-exported solar saves nothing", () => {
    const c = computeCost({ solarW: 2000, gridExportW: 2000 }, tariff);
    expect(c?.solarSavingPerHour).toBeCloseTo(0);
  });

  test("export exceeding solar (battery-fed) never goes negative", () => {
    const c = computeCost({ solarW: 1000, gridExportW: 3000 }, tariff);
    expect(c?.solarSavingPerHour).toBe(0);
  });
});
