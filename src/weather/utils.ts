const WEATHER_ICONS: Record<string, string> = {
  sunny: "mdi:weather-sunny",
  "clear-night": "mdi:weather-night",
  cloudy: "mdi:weather-cloudy",
  partlycloudy: "mdi:weather-partly-cloudy",
  rainy: "mdi:weather-pouring",
  pouring: "mdi:weather-pouring",
  snowy: "mdi:weather-snowy",
  "snowy-rainy": "mdi:weather-snowy-rainy",
  lightning: "mdi:weather-lightning",
  "lightning-rainy": "mdi:weather-lightning-rainy",
  fog: "mdi:weather-fog",
  hail: "mdi:weather-hail",
  windy: "mdi:weather-windy",
  "windy-variant": "mdi:weather-windy-variant",
  exceptional: "mdi:alert-circle-outline",
};

export function getWeatherIcon(condition: string): string {
  return WEATHER_ICONS[condition] ?? "mdi:weather-cloudy";
}

/* Placeholder oklch values; Phase 29 retunes per VIS-P05. */
const WEATHER_ICON_COLORS: Record<string, string> = {
  sunny: "oklch(0.80 0.16 75)",
  "clear-night": "oklch(0.65 0.10 250)",
  cloudy: "oklch(0.70 0.04 250)",
  partlycloudy: "oklch(0.74 0.06 240)",
  rainy: "oklch(0.66 0.14 230)",
  pouring: "oklch(0.62 0.16 235)",
  snowy: "oklch(0.85 0.02 240)",
  "snowy-rainy": "oklch(0.75 0.08 235)",
  hail: "oklch(0.78 0.06 235)",
  fog: "oklch(0.70 0.02 250)",
  lightning: "oklch(0.75 0.18 290)",
  "lightning-rainy": "oklch(0.70 0.16 280)",
  windy: "oklch(0.72 0.05 200)",
  "windy-variant": "oklch(0.72 0.05 200)",
  exceptional: "oklch(0.70 0.20 30)",
};

/** Raw CSS color string for the Widget.Icon color channel per HA weather condition. */
export function getWeatherIconColor(condition: string): string {
  return WEATHER_ICON_COLORS[condition] ?? "oklch(0.70 0.04 250)";
}

export function formatTemp(value: number | string, unit = "\u00B0"): string {
  const num = typeof value === "string" ? Number.parseFloat(value) : value;
  if (isNaN(num)) return "--";
  return `${Math.round(num)}${unit}`;
}

export function formatWindSpeed(value: number | string, unit = "km/h"): string {
  const num = typeof value === "string" ? Number.parseFloat(value) : value;
  if (isNaN(num)) return "--";
  return `${Math.round(num)} ${unit}`;
}
