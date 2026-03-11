/**
 * Sensor value formatting with device-class-aware precision.
 * Temperature: 1 decimal. Humidity: 0 decimals. Power/energy: 1 decimal. Default: 1 decimal.
 */

const PRECISION_BY_CLASS: Record<string, number> = {
  temperature: 1,
  humidity: 0,
  pressure: 0,
  power: 1,
  energy: 1,
  voltage: 1,
  current: 2,
  battery: 0,
  illuminance: 0,
  signal_strength: 0,
  carbon_dioxide: 0,
  carbon_monoxide: 0,
  pm25: 0,
  pm10: 0,
  speed: 1,
  distance: 2,
  weight: 1,
  monetary: 2,
};

export function formatSensorValue(
  value: number | string,
  deviceClass?: string | null,
  precision?: number,
): string {
  const numValue = typeof value === "string" ? Number.parseFloat(value) : value;
  if (Number.isNaN(numValue)) return typeof value === "string" ? value : "--";

  const decimals = precision ?? PRECISION_BY_CLASS[deviceClass ?? ""] ?? 1;
  return numValue.toFixed(decimals);
}
