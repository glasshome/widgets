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

const WEATHER_ICON_COLORS: Record<string, string> = {
  sunny: "bg-amber-500 dark:bg-amber-400",
  "clear-night": "bg-indigo-500 dark:bg-indigo-400",
  cloudy: "bg-slate-500 dark:bg-slate-400",
  partlycloudy: "bg-sky-500 dark:bg-sky-400",
  rainy: "bg-blue-500 dark:bg-blue-400",
  pouring: "bg-blue-600 dark:bg-blue-500",
  snowy: "bg-cyan-400 dark:bg-cyan-300",
  "snowy-rainy": "bg-cyan-500 dark:bg-cyan-400",
  lightning: "bg-violet-500 dark:bg-violet-400",
  "lightning-rainy": "bg-violet-600 dark:bg-violet-500",
  fog: "bg-slate-400 dark:bg-slate-300",
  hail: "bg-slate-500 dark:bg-slate-400",
  windy: "bg-teal-500 dark:bg-teal-400",
  "windy-variant": "bg-teal-500 dark:bg-teal-400",
  exceptional: "bg-red-500 dark:bg-red-400",
};

/** Tailwind background classes for the Widget.Icon badge per condition. */
export function getWeatherIconColor(condition: string): string {
  return WEATHER_ICON_COLORS[condition] ?? "bg-slate-500 dark:bg-slate-400";
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
