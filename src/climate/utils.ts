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

const HVAC_MODE_COLORS: Record<string, string> = {
  heat: "bg-gradient-to-br from-red-500/20 to-orange-500/20",
  cool: "bg-gradient-to-br from-blue-400/20 to-cyan-500/20",
  heat_cool: "bg-gradient-to-br from-green-400/20 to-emerald-500/20",
  auto: "bg-gradient-to-br from-green-400/20 to-emerald-500/20",
  dry: "bg-gradient-to-br from-amber-400/20 to-yellow-500/20",
  fan_only: "bg-gradient-to-br from-teal-400/20 to-cyan-500/20",
  off: "bg-gradient-to-br from-gray-500/20 to-gray-700/20",
};

export function getHvacModeColor(mode: string): string {
  return HVAC_MODE_COLORS[mode] ?? HVAC_MODE_COLORS.off!;
}

export function getHvacModeIcon(mode: string): string {
  return HVAC_MODES[mode]?.icon ?? "mdi:thermostat";
}

export function formatTemperature(value: number | undefined, unit?: string): string {
  if (value === undefined || value === null) return "--";
  const u = unit ?? "C";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}°${u}`;
}
