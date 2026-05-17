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

/*
 * MODE_COLORS_LIGHT / MODE_COLORS_DARK — Phase 29 (VIS-P05) retune.
 *
 * Hand-tuned against the /dev/palette-tune preview route (29-01). Each pair
 * targets readable vibrancy at the 22%/11% shell gradient stops in its mode.
 * Dark variants lift L by +0.02..+0.04 vs light (chroma parity within pair),
 * matching the SDK tone-token light/dark delta convention (29-01 D-10).
 */
export const MODE_COLORS_LIGHT: Record<string, { color: string; colorTo: string }> = {
  heat: {
    color: "oklch(0.66 0.20 30)" /* red-orange anchored below midline so 22% alpha stays warm on light bg */,
    colorTo: "oklch(0.62 0.20 50)" /* warmer second stop keeps the gradient reading as heat, not just red */,
  },
  cool: {
    color: "oklch(0.70 0.16 230)" /* deep enough L so blue at 22% alpha does not wash into the light surface */,
    colorTo: "oklch(0.74 0.14 200)" /* cyan-ish second stop adds depth without breaking the cool identity */,
  },
  heat_cool: {
    color: "oklch(0.70 0.16 150)" /* balanced green-cyan reads as auto/dual-mode at low alpha on light */,
    colorTo: "oklch(0.68 0.16 165)" /* slight hue shift keeps the gradient interesting without changing identity */,
  },
  auto: {
    color: "oklch(0.70 0.16 150)" /* alias of heat_cool — HVAC_MODES exposes both keys for HA compat */,
    colorTo: "oklch(0.68 0.16 165)" /* alias of heat_cool — see above */,
  },
  dry: {
    color: "oklch(0.78 0.15 85)" /* warm yellow stays readable at 22% alpha; deeper L would muddy at low alpha */,
    colorTo: "oklch(0.76 0.16 65)" /* amber second stop reinforces the moisture-removal identity */,
  },
  fan_only: {
    color: "oklch(0.76 0.13 195)" /* desaturated cyan reads as airflow without competing with cool mode */,
    colorTo: "oklch(0.78 0.12 175)" /* lighter teal second stop suggests motion */,
  },
  off: {
    color: "oklch(0.65 0.02 250)" /* matches --tone-neutral light: calm grey-blue for inactive surfaces */,
    colorTo: "oklch(0.60 0.02 250)" /* slight darkening adds depth without breaking the neutral identity */,
  },
};

export const MODE_COLORS_DARK: Record<string, { color: string; colorTo: string }> = {
  heat: {
    color: "oklch(0.70 0.20 30)" /* +0.04 L over light so red-orange stays vibrant at 22% alpha on #0c0a09 */,
    colorTo: "oklch(0.66 0.20 50)" /* +0.04 L lift preserves the warm gradient on dark bg */,
  },
  cool: {
    color: "oklch(0.74 0.16 230)" /* +0.04 L lifts blue against dark bg so 22% alpha does not go muddy */,
    colorTo: "oklch(0.78 0.14 200)" /* +0.04 L parity keeps the gradient legible on dark */,
  },
  heat_cool: {
    color: "oklch(0.74 0.16 150)" /* +0.04 L lift keeps the balanced green-cyan reading dual-mode on dark */,
    colorTo: "oklch(0.72 0.16 165)" /* +0.04 L parity with light variant */,
  },
  auto: {
    color: "oklch(0.74 0.16 150)" /* alias of heat_cool — HVAC_MODES exposes both keys for HA compat */,
    colorTo: "oklch(0.72 0.16 165)" /* alias of heat_cool — see above */,
  },
  dry: {
    color: "oklch(0.82 0.15 85)" /* +0.04 L: amber needs the lift so it reads warm-yellow, not olive, on dark */,
    colorTo: "oklch(0.80 0.16 65)" /* +0.04 L parity, slight chroma bump for the amber second stop */,
  },
  fan_only: {
    color: "oklch(0.80 0.13 195)" /* +0.04 L makes the desaturated cyan still register as airflow on dark */,
    colorTo: "oklch(0.82 0.12 175)" /* +0.04 L parity for the teal second stop */,
  },
  off: {
    color: "oklch(0.69 0.02 250)" /* matches --tone-neutral dark: +0.04 L over light, chroma parity */,
    colorTo: "oklch(0.64 0.02 250)" /* +0.04 L parity for the second stop */,
  },
};

/**
 * Resolve the mode color pair for the active theme at render time. Falls back
 * to the `off` entry if the mode key is unknown (defense against malformed HA
 * states; see T-29-06).
 */
export function getModeColors(
  mode: string,
  dark: boolean,
): { color: string; colorTo: string } {
  const table = dark ? MODE_COLORS_DARK : MODE_COLORS_LIGHT;
  return table[mode] ?? table.off;
}

export function getHvacModeIcon(mode: string): string {
  return HVAC_MODES[mode]?.icon ?? "mdi:thermostat";
}

export function formatTemperature(value: number | undefined, unit?: string): string {
  if (value === undefined || value === null) return "--";
  const u = unit ?? "C";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}°${u}`;
}
