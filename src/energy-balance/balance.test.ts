import { describe, expect, test } from "bun:test";
import {
  type BalanceInputs,
  deriveBalance,
  deriveConsumption,
  selfSufficiency,
  statusFromNet,
} from "./balance";

function inputs(overrides: Partial<BalanceInputs> = {}): BalanceInputs {
  return {
    producedKWh: 0,
    gridImportKWh: 0,
    gridExportKWh: 0,
    batteryChargeKWh: 0,
    batteryDischargeKWh: 0,
    homeKWh: null,
    ...overrides,
  };
}

describe("deriveConsumption", () => {
  test("derives from the energy balance when no home sensor", () => {
    // produced 8 + import 4 - export 2 = 10 consumed.
    expect(deriveConsumption(inputs({ producedKWh: 8, gridImportKWh: 4, gridExportKWh: 2 }))).toBe(
      10,
    );
  });

  test("battery discharge adds, charge subtracts", () => {
    // import 5 + discharge 3 - charge 1 = 7.
    expect(
      deriveConsumption(inputs({ gridImportKWh: 5, batteryDischargeKWh: 3, batteryChargeKWh: 1 })),
    ).toBe(7);
  });

  test("home sensor overrides the derived value", () => {
    expect(deriveConsumption(inputs({ producedKWh: 8, gridImportKWh: 4, homeKWh: 12 }))).toBe(12);
  });

  test("never returns negative", () => {
    expect(deriveConsumption(inputs({ gridExportKWh: 5 }))).toBe(0);
  });
});

describe("selfSufficiency", () => {
  test("share not drawn from grid", () => {
    expect(selfSufficiency(10, 3)).toBeCloseTo(0.7);
  });

  test("full self-sufficiency when nothing imported", () => {
    expect(selfSufficiency(10, 0)).toBe(1);
  });

  test("clamps to 0 when import exceeds consumption", () => {
    expect(selfSufficiency(10, 15)).toBe(0);
  });

  test("zero consumption reads as not self-sufficient, never divides by zero", () => {
    expect(selfSufficiency(0, 0)).toBe(0);
  });
});

describe("statusFromNet", () => {
  test("importing above threshold", () => {
    expect(statusFromNet(1200)).toBe("import");
  });
  test("exporting below negative threshold", () => {
    expect(statusFromNet(-800)).toBe("export");
  });
  test("small magnitude reads balanced", () => {
    expect(statusFromNet(20)).toBe("balanced");
    expect(statusFromNet(-20)).toBe("balanced");
  });
});

describe("deriveBalance", () => {
  test("amber arc share equals the center KPI", () => {
    const b = deriveBalance(inputs({ producedKWh: 7, gridImportKWh: 3, homeKWh: 10 }), -400, true);
    // consumed 10, import 3 -> 70% self-sufficient, exporting live.
    expect(b.consumedKWh).toBe(10);
    expect(b.selfSufficiency).toBeCloseTo(0.7);
    expect(Math.round(b.selfSufficiency * 100)).toBe(70);
    expect(b.status).toBe("export");
  });

  test("carries the configured flag through", () => {
    expect(deriveBalance(inputs(), 0, false).configured).toBe(false);
  });
});
