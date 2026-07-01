/**
 * Energy Flow config schema (SDK-E05 decision: FLAT schema).
 *
 * SchemaForm (packages/public/ui/src/solid/schema-form.tsx) can only render a
 * flat object of: entity arrays (domain → EntitySelector), enums (→ Select),
 * booleans (→ Switch), numbers, and strings. It has NO support for
 * discriminated unions or conditional field visibility.
 *
 * So every field here is optional and top-level. Mode selectors are plain
 * enums, not discriminated unions. The guidance that would normally live in a
 * "show this field only when…" rule is instead carried in each field's
 * `description` meta ("Leave empty if your grid sensor reports signed values").
 *
 * Conditional config UI is a future SDK feature; when it lands, grid/battery
 * dual-vs-signed and tariff both-or-neither can become real unions.
 */

import { widgetFields, z } from "@glasshome/widget-sdk";

const consumptionStrategy = z
  .enum(["entity", "grid_plus_solar", "sum_consumers"])
  .default("grid_plus_solar")
  .meta({
    title: "Home consumption",
    description:
      "How to compute home usage: a dedicated sensor (entity), grid + solar math, or the sum of individual consumers.",
  });

const powerEntity = (label: string, description: string) =>
  z
    .array(z.string())
    .default([])
    .meta({ domain: "sensor", deviceClass: "power", title: label, description, singleSelect: true });

const socEntity = (label: string) =>
  z.array(z.string()).default([]).meta({
    domain: "sensor",
    deviceClass: "battery",
    title: label,
    description: "Optional. State-of-charge sensor (%) shown on the node.",
    singleSelect: true,
  });

export const configSchema = z.object({
  title: widgetFields.title(),

  // Solar (single power sensor; positive = producing).
  solarEntity: powerEntity("Solar power", "Solar production power sensor (W)."),

  // Grid: dual sensors OR a single signed sensor.
  gridImportEntity: powerEntity(
    "Grid import",
    "Power drawn from the grid (W). Leave empty if your grid sensor reports signed values.",
  ),
  gridExportEntity: powerEntity(
    "Grid export",
    "Power sent to the grid (W). Leave empty if you use a single signed grid sensor.",
  ),
  gridSignedEntity: powerEntity(
    "Grid (signed)",
    "Single grid sensor where positive = import, negative = export. Use instead of separate import/export.",
  ),

  // Battery: dual sensors OR a single signed sensor.
  batteryChargeEntity: powerEntity(
    "Battery charging",
    "Power flowing into the battery (W). Leave empty if your battery sensor reports signed values.",
  ),
  batteryDischargeEntity: powerEntity(
    "Battery discharging",
    "Power flowing out of the battery (W). Leave empty if you use a single signed battery sensor.",
  ),
  batterySignedEntity: powerEntity(
    "Battery (signed)",
    "Single battery sensor where positive = charging, negative = discharging.",
  ),
  batterySocEntity: socEntity("Battery charge level"),

  // Home.
  homeStrategy: consumptionStrategy,
  homeEntity: powerEntity(
    "Home power",
    "Total home consumption sensor (W). Used when consumption is set to 'entity'.",
  ),
  consumerEntities: z.array(z.string()).default([]).meta({
    domain: "sensor",
    deviceClass: "power",
    title: "Consumers",
    description: "Individual consumer power sensors (W). Summed when consumption is 'sum_consumers'.",
  }),

  // EV.
  evEntity: powerEntity("EV charging power", "Electric-vehicle charging power sensor (W)."),
  evSocEntity: socEntity("EV charge level"),

  // Sun (for the night-resting solar state). Targets the sun domain, not a
  // power sensor: the runtime reads sun.sun's state ("below_horizon").
  sunEntity: z.array(z.string()).default([]).meta({
    domain: "sun",
    title: "Sun entity",
    description: "Optional. Your sun.sun entity, used to rest the solar node after sunset.",
    singleSelect: true,
  }),

  // Tariff (both-or-neither; enforced softly via descriptions).
  tariffCurrency: z.string().optional().meta({
    title: "Currency",
    description: "Optional. Currency symbol for cost estimates (e.g. €). Set together with the rate.",
  }),
  tariffRate: z.number().optional().meta({
    title: "Rate per kWh",
    description: "Optional. Price per kWh. Set together with the currency.",
  }),
});

export type EnergyFlowConfig = z.infer<typeof configSchema>;
