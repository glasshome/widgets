import type { EnergyPreferences } from "@glasshome/sync-layer";
import { describe, expect, test } from "bun:test";
import { mapEnergyPreferences } from "./auto-discovery";

const prefs: EnergyPreferences = {
  energy_sources: [
    {
      type: "grid",
      flow_from: [{ stat_energy_from: "sensor.grid_in" }],
      flow_to: [{ stat_energy_to: "sensor.grid_out" }],
    },
    { type: "solar", stat_energy_from: "sensor.solar_prod" },
    {
      type: "battery",
      stat_energy_from: "sensor.battery_out",
      stat_energy_to: "sensor.battery_in",
    },
  ],
  device_consumption: [
    { stat_consumption: "sensor.dishwasher", name: "Dishwasher" },
    { stat_consumption: "sensor.ev_charger" },
  ],
};

describe("mapEnergyPreferences", () => {
  test("maps grid, solar, battery and consumers", () => {
    expect(mapEnergyPreferences(prefs)).toEqual({
      gridImport: "sensor.grid_in",
      gridExport: "sensor.grid_out",
      solar: "sensor.solar_prod",
      batteryDischarge: "sensor.battery_out",
      batteryCharge: "sensor.battery_in",
      consumers: [
        { statId: "sensor.dishwasher", name: "Dishwasher" },
        { statId: "sensor.ev_charger", name: undefined },
      ],
    });
  });

  test("null prefs → all undefined, empty consumers", () => {
    expect(mapEnergyPreferences(null)).toEqual({ consumers: [] });
  });

  test("empty sources → empty consumers", () => {
    expect(
      mapEnergyPreferences({ energy_sources: [], device_consumption: [] }),
    ).toEqual({ consumers: [] });
  });
});
