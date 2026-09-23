import type { WeatherForecast } from "@glasshome/widget-sdk";

const SKY_GROUP: Record<string, string> = {
  sunny: "clear",
  "clear-night": "clear",
  partlycloudy: "partly",
  cloudy: "cloudy",
  fog: "fog",
  rainy: "rain",
  pouring: "rain",
  "lightning-rainy": "storm",
  lightning: "storm",
  hail: "storm",
  snowy: "snow",
  "snowy-rainy": "snow",
  windy: "wind",
  "windy-variant": "wind",
};

const group = (h: WeatherForecast) => SKY_GROUP[h.condition ?? ""] ?? h.condition ?? "";

/** Hours where the sky turns into something else; the first hour always counts. */
export function skyChanges(hours: WeatherForecast[]): number[] {
  const out: number[] = [];
  hours.forEach((h, i) => {
    const prev = hours[i - 1];
    if (!prev || group(prev) !== group(h)) out.push(i);
  });
  return out;
}

/** A smooth line through the points (Catmull-Rom as cubic Béziers), as SVG path commands. */
export function smoothPath(points: { x: number; y: number }[]): string {
  const first = points[0];
  if (!first) return "";
  let d = `M${first.x.toFixed(2)},${first.y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    if (!p0 || !p1 || !p2 || !p3) continue;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

/** Hours from the current one on; Home Assistant can still list the hour that just passed. */
export function upcomingHours(hourly: WeatherForecast[], now: Date): WeatherForecast[] {
  const from = now.getTime() - 60 * 60 * 1000;
  return hourly.filter((h) => new Date(h.datetime).getTime() > from);
}

export function dayHigh(d: WeatherForecast): number | undefined {
  return d.temp_high ?? d.temperature;
}

/** The week's coldest low and warmest high, the scale every day's bar is drawn on. */
export function weekRange(days: WeatherForecast[]): { min: number; max: number } | undefined {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const d of days) {
    const high = dayHigh(d);
    const low = d.temp_low ?? high;
    if (low != null) min = Math.min(min, low);
    if (high != null) max = Math.max(max, high);
  }
  return Number.isFinite(min) && Number.isFinite(max)
    ? { min, max: Math.max(max, min + 1) }
    : undefined;
}

/** Cold blue through mild green to hot orange, so a bar's colour reads as its temperature. */
export function tempColor(t: number): string {
  const x = Math.min(1, Math.max(0, (t + 5) / 40));
  const hue = 250 - x * 205;
  return `oklch(0.74 0.17 ${hue.toFixed(0)})`;
}
