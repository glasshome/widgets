export const HVAC_MODES: Record<string, { icon: string; key: string }> = {
  off: { icon: "mdi:power", key: "climate.mode.off" },
  heat: { icon: "mdi:fire", key: "climate.mode.heat" },
  cool: { icon: "mdi:snowflake", key: "climate.mode.cool" },
  heat_cool: { icon: "mdi:sun-snowflake-variant", key: "climate.mode.heat-cool" },
  auto: { icon: "mdi:thermostat-auto", key: "climate.mode.auto" },
  dry: { icon: "mdi:water-percent", key: "climate.mode.dry" },
  fan_only: { icon: "mdi:fan", key: "climate.mode.fan-only" },
};

export const FAN_MODES: Record<string, { icon: string; key: string }> = {
  auto: { icon: "mdi:fan-auto", key: "climate.fan.auto" },
  low: { icon: "mdi:fan-speed-1", key: "climate.fan.low" },
  medium: { icon: "mdi:fan-speed-2", key: "climate.fan.medium" },
  high: { icon: "mdi:fan-speed-3", key: "climate.fan.high" },
};

const MODE_COLORS_LIGHT: Record<string, { color: string; colorTo: string }> = {
  heat: {
    color: "oklch(0.66 0.20 30)",
    colorTo: "oklch(0.62 0.20 50)",
  },
  cool: {
    color: "oklch(0.70 0.16 230)",
    colorTo: "oklch(0.74 0.14 200)",
  },
  heat_cool: {
    color: "oklch(0.70 0.16 150)",
    colorTo: "oklch(0.68 0.16 165)",
  },
  auto: {
    color: "oklch(0.70 0.16 150)",
    colorTo: "oklch(0.68 0.16 165)",
  },
  dry: {
    color: "oklch(0.78 0.15 85)",
    colorTo: "oklch(0.76 0.16 65)",
  },
  fan_only: {
    color: "oklch(0.76 0.13 195)",
    colorTo: "oklch(0.78 0.12 175)",
  },
  off: {
    color: "oklch(0.65 0.02 250)",
    colorTo: "oklch(0.60 0.02 250)",
  },
};

const MODE_COLORS_DARK: Record<string, { color: string; colorTo: string }> = {
  heat: {
    color: "oklch(0.70 0.20 30)",
    colorTo: "oklch(0.66 0.20 50)",
  },
  cool: {
    color: "oklch(0.74 0.16 230)",
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
    color: "oklch(0.82 0.15 85)",
    colorTo: "oklch(0.80 0.16 65)",
  },
  fan_only: {
    color: "oklch(0.80 0.13 195)",
    colorTo: "oklch(0.82 0.12 175)",
  },
  off: {
    color: "oklch(0.69 0.02 250)",
    colorTo: "oklch(0.64 0.02 250)",
  },
};

export function getModeColors(mode: string, dark: boolean): { color: string; colorTo: string } {
  const table = dark ? MODE_COLORS_DARK : MODE_COLORS_LIGHT;
  return table[mode] ?? table.off;
}

export function getHvacModeIcon(mode: string): string {
  return HVAC_MODES[mode]?.icon ?? "mdi:thermostat";
}
