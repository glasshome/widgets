import { defineConfig, field, type Infer } from "@glasshome/widget-sdk";

export const configSchema = defineConfig({
  title: field.title(),
  co2IntensityEntity: field.entity("sensor", {
    title: "CO2 intensity sensor",
    description:
      "From the Electricity Maps integration, e.g. sensor.electricity_maps_co2_intensity (g/kWh).",
  }),
  fossilFuelEntity: field.entity("sensor", {
    title: "Fossil fuel percentage sensor",
    description:
      "From the Electricity Maps integration, e.g. sensor.electricity_maps_fossil_fuel_percentage.",
  }),
  priceEntity: field.entity("sensor", {
    title: "Electricity price sensor",
    description: "Optional. A current-price sensor (Nordpool, Tibber, ...).",
  }),
  cheapBelow: field.number({
    title: "Cheap below",
    description:
      "Optional. Prices under this count as cheap, in the price sensor's own unit. Needs the price sensor.",
  }),
}).check((ctx) => {
  const v = ctx.value;
  if (v.cheapBelow !== undefined && v.priceEntity.length === 0) {
    ctx.issues.push({
      code: "custom",
      message: "Cheap below needs an electricity price sensor.",
      input: v,
    });
  }
});

export type ElectricityGridConfig = Infer<typeof configSchema>;
