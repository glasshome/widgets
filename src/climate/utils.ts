export const HVAC_MODES: Record<string, { icon: string; label: string }> = {
  off: { icon: "mdi:power", label: "Off" },
  heat: { icon: "mdi:fire", label: "Heat" },
  cool: { icon: "mdi:snowflake", label: "Cool" },
  heat_cool: { icon: "mdi:sun-snowflake-variant", label: "Auto" },
  auto: { icon: "mdi:thermostat-auto", label: "Auto" },
  dry: { icon: "mdi:water-percent", label: "Dry" },
  fan_only: { icon: "mdi:fan", label: "Fan" },
};

export const FAN_MODES: Record<string, { icon: string; label: string }> = {
  auto: { icon: "mdi:fan-auto", label: "Auto" },
  low: { icon: "mdi:fan-speed-1", label: "Low" },
  medium: { icon: "mdi:fan-speed-2", label: "Medium" },
  high: { icon: "mdi:fan-speed-3", label: "High" },
};

/* Placeholder oklch values; Phase 29 (VIS-P05) retunes the palette. */
export const MODE_COLORS: Record<string, { color: string; colorTo: string }> = {
  heat: {
    color: "oklch(0.70 0.20 30)",
    colorTo: "oklch(0.65 0.20 50)",
  },
  cool: {
    color: "oklch(0.72 0.16 230)",
    colorTo: "oklch(0.78 0.14 200)",
  },
  heat_cool: {
    color: "oklch(0.74 0.16 150)",
    colorTo: "oklch(0.72 0.16 165)",
  },
  auto: {
    color: "oklch(0.74 0.16 150)",
    colorTo: "oklch(0.72 0.16 165)",
  },
  dry: {
    color: "oklch(0.80 0.15 85)",
    colorTo: "oklch(0.78 0.16 65)",
  },
  fan_only: {
    color: "oklch(0.78 0.13 195)",
    colorTo: "oklch(0.80 0.12 175)",
  },
  off: {
    color: "oklch(0.65 0.02 250)",
    colorTo: "oklch(0.60 0.02 250)",
  },
};

export function getHvacModeIcon(mode: string): string {
  return HVAC_MODES[mode]?.icon ?? "mdi:thermostat";
}

export function formatTemperature(value: number | undefined, unit?: string): string {
  if (value === undefined || value === null) return "--";
  const u = unit ?? "C";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}°${u}`;
}
