/** Warm to cool whites, then colours: one tap each, the same row on every light panel. */
export const LIGHT_SWATCHES = [
  "#ffb35a",
  "#ffd79a",
  "#fff1dc",
  "#dfeeff",
  "#ff5b4d",
  "#ec5aa0",
  "#8a63f5",
  "#3f8cff",
] as const satisfies readonly string[];

const WHITE_KELVIN: Record<string, number> = {
  "#ffb35a": 2200,
  "#ffd79a": 2700,
  "#fff1dc": 4000,
  "#dfeeff": 6000,
};

/** The `light.turn_on` data a swatch sends: a colour temperature for the whites, an RGB colour otherwise. */
export function swatchService(color: string): Record<string, unknown> {
  const kelvin = WHITE_KELVIN[color];
  if (kelvin) return { color_temp_kelvin: kelvin };
  const n = Number.parseInt(color.slice(1), 16);
  return { rgb_color: [(n >> 16) & 255, (n >> 8) & 255, n & 255] };
}
