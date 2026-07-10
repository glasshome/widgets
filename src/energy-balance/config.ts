// Flat schema per SDK-E05 (see energy-flow/config.ts). Energy (kWh) sensors
// feed the daily ring via statistics; grid live power (W) only drives the tint.

import { defineConfig, field, type Infer } from "@glasshome/widget-sdk";

const energyEntity = (label: string, description: string) =>
  field.entity("sensor", { title: label, description, deviceClass: "energy" });

const powerEntity = (label: string, description: string) =>
  field.entity("sensor", { title: label, description, deviceClass: "power" });

export const configSchema = defineConfig({
  title: field.title(),
  solarEnergyEntity: energyEntity(
    "Solar produced",
    "Daily solar production energy sensor (kWh). Required.",
  ),
  gridImportEnergyEntity: energyEntity(
    "Grid imported",
    "Daily energy drawn from the grid (kWh). Required to compute self-sufficiency.",
  ),
  gridExportEnergyEntity: energyEntity(
    "Grid exported",
    "Daily energy sent to the grid (kWh). Optional.",
  ),
  batteryChargeEnergyEntity: energyEntity(
    "Battery charged",
    "Daily energy stored into the battery (kWh). Optional.",
  ),
  batteryDischargeEnergyEntity: energyEntity(
    "Battery discharged",
    "Daily energy drawn from the battery (kWh). Optional.",
  ),
  homeEnergyEntity: energyEntity(
    "Home consumed",
    "Daily total home consumption (kWh). Optional. Overrides the derived value when set.",
  ),
  gridImportPowerEntity: powerEntity(
    "Grid import (live)",
    "Live power drawn from the grid (W). Optional. Leave empty if your grid sensor is signed.",
  ),
  gridExportPowerEntity: powerEntity(
    "Grid export (live)",
    "Live power sent to the grid (W). Optional.",
  ),
  gridSignedPowerEntity: powerEntity(
    "Grid live (signed)",
    "Single live grid sensor where positive = import, negative = export. Use instead of the two above.",
  ),
  solarPowerEntity: powerEntity(
    "Solar power (live)",
    "Live solar production power (W). Enables the Live mode (tap the widget to cycle).",
  ),
  homePowerEntity: powerEntity(
    "Home power (live)",
    "Live home consumption power (W). Enables the Live mode.",
  ),
});

export type EnergyBalanceConfig = Infer<typeof configSchema>;
