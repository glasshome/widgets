import { describe, expect, test } from "bun:test";
import type { EnergyFlowConfig } from "./config";
import { deriveFlow, isUnconfigured, netPower, type PowerLookup } from "./flow";

// Plain config builder — avoids importing config.ts (which pulls the SDK
// barrel and its DOM-only code) into this server-side unit test.
function makeConfig(overrides: Partial<EnergyFlowConfig> = {}): EnergyFlowConfig {
  return {
    solarEntity: [],
    gridImportEntity: [],
    gridExportEntity: [],
    gridSignedEntity: [],
    batteryChargeEntity: [],
    batteryDischargeEntity: [],
    batterySignedEntity: [],
    batterySocEntity: [],
    homeStrategy: "grid_plus_solar",
    homeEntity: [],
    consumerEntities: [],
    evEntity: [],
    evSocEntity: [],
    sunEntity: [],
    ...overrides,
  };
}

function lookupFrom(values: Record<string, number | null>): PowerLookup {
  return (id) => (id in values ? values[id] : null);
}

describe("deriveFlow", () => {
  test("empty config is unconfigured", () => {
    const flow = deriveFlow(makeConfig(), () => null, false);
    expect(isUnconfigured(flow)).toBe(true);
  });

  test("dual grid sensors split import/export", () => {
    const config = makeConfig({
      gridImportEntity: ["sensor.import"],
      gridExportEntity: ["sensor.export"],
    });
    const flow = deriveFlow(
      config,
      lookupFrom({ "sensor.import": 1200, "sensor.export": 0 }),
      false,
    );
    expect(flow.grid.direction).toBe("import");
    expect(flow.grid.watts).toBe(1200);
  });

  test("single signed grid sensor maps negative to export", () => {
    const config = makeConfig({ gridSignedEntity: ["sensor.grid"] });
    const flow = deriveFlow(config, lookupFrom({ "sensor.grid": -800 }), false);
    expect(flow.grid.direction).toBe("export");
    expect(flow.grid.watts).toBe(800);
    expect(netPower(flow)).toBe(-800);
  });

  test("battery signed sensor maps positive to charge", () => {
    const config = makeConfig({ batterySignedEntity: ["sensor.bat"] });
    const flow = deriveFlow(config, lookupFrom({ "sensor.bat": 500 }), false);
    expect(flow.battery.direction).toBe("charge");
    expect(flow.battery.watts).toBe(500);
  });

  test("grid_plus_solar consumption math", () => {
    const config = makeConfig({
      solarEntity: ["sensor.solar"],
      gridSignedEntity: ["sensor.grid"],
    });
    const flow = deriveFlow(
      config,
      lookupFrom({ "sensor.solar": 2000, "sensor.grid": 500 }),
      false,
    );
    // grid import 500 + solar 2000 = 2500 home.
    expect(flow.home.watts).toBe(2500);
    expect(flow.home.configured).toBe(true);
  });

  test("unavailable sensor marks the node stale", () => {
    const config = makeConfig({ solarEntity: ["sensor.solar"] });
    const flow = deriveFlow(config, lookupFrom({ "sensor.solar": null }), false);
    expect(flow.solar.stale).toBe(true);
    expect(flow.solar.configured).toBe(true);
  });

  test("multiple solar sensors sum into one node", () => {
    const config = makeConfig({ solarEntity: ["sensor.roof", "sensor.garage"] });
    const flow = deriveFlow(
      config,
      lookupFrom({ "sensor.roof": 1500, "sensor.garage": 800 }),
      false,
    );
    expect(flow.solar.watts).toBe(2300);
    expect(flow.solar.configured).toBe(true);
    expect(flow.solar.stale).toBe(false);
  });

  test("one unavailable solar sensor marks the node stale but sums the rest", () => {
    const config = makeConfig({ solarEntity: ["sensor.roof", "sensor.garage"] });
    const flow = deriveFlow(
      config,
      lookupFrom({ "sensor.roof": 1500, "sensor.garage": null }),
      false,
    );
    expect(flow.solar.watts).toBe(1500);
    expect(flow.solar.stale).toBe(true);
  });

  test("solar rests at night when below horizon and not producing", () => {
    const config = makeConfig({ solarEntity: ["sensor.solar"] });
    const flow = deriveFlow(config, lookupFrom({ "sensor.solar": 0 }), true);
    expect(flow.solarSleeping).toBe(true);
    expect(flow.flowState.solarSleeping).toBe(true);
  });

  test("solar does not rest while still producing after dark", () => {
    const config = makeConfig({ solarEntity: ["sensor.solar"] });
    const flow = deriveFlow(config, lookupFrom({ "sensor.solar": 200 }), true);
    expect(flow.solarSleeping).toBe(false);
  });

  test("solar rests at night with small inverter standby draw", () => {
    const config = makeConfig({ solarEntity: ["sensor.solar"] });
    const flow = deriveFlow(config, lookupFrom({ "sensor.solar": 10 }), true);
    expect(flow.solarSleeping).toBe(true);
    expect(flow.flowState.solarSleeping).toBe(true);
  });

  test("battery SOC is surfaced when configured", () => {
    const config = makeConfig({
      batterySignedEntity: ["sensor.bat"],
      batterySocEntity: ["sensor.soc"],
    });
    const flow = deriveFlow(
      config,
      lookupFrom({ "sensor.bat": -300, "sensor.soc": 72 }),
      false,
    );
    expect(flow.battery.soc).toBe(72);
  });

  test("sum_consumers totals the consumer sensors", () => {
    const config = makeConfig({
      homeStrategy: "sum_consumers",
      consumerEntities: ["sensor.a", "sensor.b"],
    });
    const flow = deriveFlow(
      config,
      lookupFrom({ "sensor.a": 300, "sensor.b": 200 }),
      false,
    );
    expect(flow.home.watts).toBe(500);
    expect(flow.home.configured).toBe(true);
  });
});
