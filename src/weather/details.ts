import type { TranslationTools } from "@glasshome/widget-sdk";
import type { Detail } from "./layout";
import { formatTemp, formatWindSpeed } from "./utils";

type Tools = Pick<TranslationTools, "t" | "translateState" | "formatNumber" | "formatDate">;

const UV_WORDS: [number, string][] = [
  [11, "weather.uv.extreme"],
  [8, "weather.uv.very-high"],
  [6, "weather.uv.high"],
  [3, "weather.uv.moderate"],
  [0, "weather.uv.low"],
];

export function weatherDetails(tools: Tools, attr: <T>(key: string) => T | undefined): Detail[] {
  const out: Detail[] = [];
  const whole = (n: number) => tools.formatNumber(Math.round(n));
  const feels = attr<number>("apparent_temperature");
  if (feels != null) {
    out.push({
      icon: "mdi:thermometer",
      label: tools.t("weather.detail.feels-like"),
      value: formatTemp(tools, feels),
    });
  }
  const wind = attr<number>("wind_speed");
  if (wind != null) {
    const bearing = attr<number>("wind_bearing");
    out.push({
      icon: bearing != null ? "mdi:navigation" : "mdi:weather-windy",
      label: tools.t("weather.detail.wind"),
      value: formatWindSpeed(tools, wind, attr<string>("wind_speed_unit") ?? undefined),
      rotate: bearing != null ? bearing + 180 : undefined,
    });
  }
  const humidity = attr<number>("humidity");
  if (humidity != null) {
    out.push({
      icon: "mdi:water-percent",
      label: tools.t("weather.detail.humidity"),
      value: tools.formatNumber(Math.round(humidity) / 100, { style: "percent" }),
    });
  }
  const uv = attr<number>("uv_index");
  if (uv != null) {
    const word = UV_WORDS.find(([min]) => uv >= min)?.[1];
    out.push({
      icon: "mdi:sun-wireless-outline",
      label: tools.t("weather.detail.uv-index"),
      value: `${whole(uv)} ${word ? tools.t(word) : ""}`.trim(),
    });
  }
  const pressure = attr<number>("pressure");
  if (pressure != null) {
    const unit = attr<string>("pressure_unit") ?? "hPa";
    out.push({
      icon: "mdi:gauge",
      label: tools.t("weather.detail.pressure"),
      value: `${whole(pressure)} ${unit}`,
    });
  }
  const visibility = attr<number>("visibility");
  if (visibility != null) {
    const unit = attr<string>("visibility_unit") ?? "km";
    out.push({
      icon: "mdi:eye-outline",
      label: tools.t("weather.detail.visibility"),
      value: `${whole(visibility)} ${unit}`,
    });
  }
  return out;
}
