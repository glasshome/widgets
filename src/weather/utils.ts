export type WeatherCondition =
  | "sunny"
  | "clear-night"
  | "cloudy"
  | "partlycloudy"
  | "rainy"
  | "pouring"
  | "snowy"
  | "snowy-rainy"
  | "lightning"
  | "lightning-rainy"
  | "fog"
  | "hail"
  | "windy"
  | "windy-variant"
  | "exceptional";

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

const WEATHER_GRADIENTS: Record<string, string> = {
  sunny: "linear-gradient(135deg, #f59e0b, #f97316, #eab308)",
  "clear-night": "linear-gradient(135deg, #1e3a5f, #2d1b69, #0f172a)",
  cloudy: "linear-gradient(135deg, #6b7280, #9ca3af, #6b7280)",
  partlycloudy: "linear-gradient(135deg, #60a5fa, #93c5fd, #d1d5db)",
  rainy: "linear-gradient(135deg, #475569, #64748b, #334155)",
  pouring: "linear-gradient(135deg, #374151, #4b5563, #1f2937)",
  snowy: "linear-gradient(135deg, #bfdbfe, #e0e7ff, #dbeafe)",
  "snowy-rainy": "linear-gradient(135deg, #94a3b8, #cbd5e1, #94a3b8)",
  lightning: "linear-gradient(135deg, #374151, #6b21a8, #374151)",
  "lightning-rainy": "linear-gradient(135deg, #1e293b, #4c1d95, #1e293b)",
  fog: "linear-gradient(135deg, #9ca3af, #d1d5db, #9ca3af)",
  hail: "linear-gradient(135deg, #64748b, #94a3b8, #64748b)",
  windy: "linear-gradient(135deg, #6ee7b7, #a7f3d0, #67e8f9)",
  "windy-variant": "linear-gradient(135deg, #6ee7b7, #93c5fd, #67e8f9)",
  exceptional: "linear-gradient(135deg, #ef4444, #f97316, #ef4444)",
};

export function getWeatherIcon(condition: string): string {
  return WEATHER_ICONS[condition] ?? "mdi:weather-cloudy";
}

export function getWeatherGradient(condition: string): string {
  return WEATHER_GRADIENTS[condition] ?? WEATHER_GRADIENTS.cloudy;
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
