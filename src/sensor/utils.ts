import type { TranslationTools } from "@glasshome/widget-sdk";

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

const CLASS_KEYS: Record<string, string> = {
  temperature: "sensor.class.temperature",
  humidity: "sensor.class.humidity",
  pressure: "sensor.class.pressure",
  power: "sensor.class.power",
  energy: "sensor.class.energy",
  voltage: "sensor.class.voltage",
  current: "sensor.class.current",
  battery: "sensor.class.battery",
  illuminance: "sensor.class.illuminance",
  signal_strength: "sensor.class.signal-strength",
  carbon_dioxide: "sensor.class.carbon-dioxide",
  carbon_monoxide: "sensor.class.carbon-monoxide",
  pm25: "sensor.class.pm25",
  pm10: "sensor.class.pm10",
  speed: "sensor.class.speed",
  distance: "sensor.class.distance",
  weight: "sensor.class.weight",
  monetary: "sensor.class.monetary",
};

export function sensorClass(
  tools: Pick<TranslationTools, "t">,
  deviceClass: string | null,
): string {
  if (!deviceClass) return tools.t("sensor.name");
  if (Object.hasOwn(CLASS_KEYS, deviceClass)) return tools.t(CLASS_KEYS[deviceClass] ?? "");
  const spaced = deviceClass.replaceAll("_", " ");
  return `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}`;
}

export function formatSensorValue(
  tools: Pick<TranslationTools, "formatNumber">,
  value: number | string,
  deviceClass?: string | null,
  precision?: number,
): string {
  const numValue = typeof value === "string" ? Number.parseFloat(value) : value;
  if (Number.isNaN(numValue)) return typeof value === "string" ? value : "--";

  const decimals = precision ?? PRECISION_BY_CLASS[deviceClass ?? ""] ?? 1;
  return tools.formatNumber(numValue, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function sparkValue(tools: Pick<TranslationTools, "formatNumber">, v: number): string {
  const digits = Math.abs(v) >= 100 ? 0 : 1;
  return tools.formatNumber(v, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export interface Reading {
  /** ms epoch */
  t: number;
  value: number;
}

export interface RangeSummary {
  min: number;
  max: number;
  average: number;
}

/**
 * The readings inside [from, to]: the reading in force at `from` carried to the start,
 * so a sensor that last changed an hour before the window still draws from its left edge.
 */
export function readingsWithin(readings: Reading[], from: number, to: number): Reading[] {
  const sorted = [...readings].sort((a, b) => a.t - b.t);
  const inside = sorted.filter((r) => r.t >= from && r.t <= to);
  const before = sorted.filter((r) => r.t < from).at(-1);
  if (before) inside.unshift({ t: from, value: before.value });
  return inside;
}

/** Min, max and time-weighted average: each reading counts for as long as it held. */
export function summarize(readings: Reading[], to: number): RangeSummary | undefined {
  if (readings.length === 0) return undefined;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let area = 0;
  let span = 0;
  readings.forEach((r, i) => {
    min = Math.min(min, r.value);
    max = Math.max(max, r.value);
    const end = readings[i + 1]?.t ?? to;
    const held = Math.max(0, end - r.t);
    area += r.value * held;
    span += held;
  });
  const average =
    span > 0 ? area / span : readings.reduce((s, r) => s + r.value, 0) / readings.length;
  return { min, max, average };
}

/** At most `buckets` points, each the mean of its slice, so a week of minutes stays a light path. */
export function downsample(readings: Reading[], buckets: number): Reading[] {
  if (readings.length <= buckets) return readings;
  const size = readings.length / buckets;
  return Array.from({ length: buckets }, (_, i) => {
    const slice = readings.slice(Math.floor(i * size), Math.floor((i + 1) * size));
    const value = slice.reduce((s, r) => s + r.value, 0) / slice.length;
    return { t: slice[0]?.t ?? 0, value };
  });
}
