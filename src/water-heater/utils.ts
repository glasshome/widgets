export const OPERATION_MODES: Record<string, { icon: string; label: string }> = {
  off: { icon: "mdi:power", label: "Off" },
  eco: { icon: "mdi:leaf", label: "Eco" },
  electric: { icon: "mdi:lightning-bolt", label: "Electric" },
  gas: { icon: "mdi:fire", label: "Gas" },
  heat_pump: { icon: "mdi:heat-pump", label: "Heat pump" },
  high_demand: { icon: "mdi:speedometer", label: "High demand" },
  performance: { icon: "mdi:rocket-launch", label: "Performance" },
};

/*
 * Light/dark color pairs per operation mode, following the climate widget
 * convention: dark lifts L by +0.02..+0.04 over light at chroma parity, and
 * each pair targets readable vibrancy at the 22%/11% shell gradient stops.
 */
const MODE_COLORS_LIGHT: Record<string, { color: string; colorTo: string }> = {
  eco: {
    color: "oklch(0.72 0.17 145)" /* leafy green anchored mid-L so 22% alpha reads eco, not neon */,
    colorTo:
      "oklch(0.70 0.16 160)" /* slight cyan drift adds depth without leaving the green identity */,
  },
  electric: {
    color: "oklch(0.78 0.15 85)" /* warm yellow, same pair as climate dry: energy without alarm */,
    colorTo: "oklch(0.76 0.16 65)" /* amber second stop reinforces the electric identity */,
  },
  gas: {
    color:
      "oklch(0.66 0.20 40)" /* orange anchored below midline so the flame tone stays warm on light bg */,
    colorTo:
      "oklch(0.62 0.20 55)" /* deeper amber second stop keeps the gradient reading as burn */,
  },
  heat_pump: {
    color:
      "oklch(0.72 0.14 180)" /* teal reads as efficient heat exchange, distinct from cool blue */,
    colorTo: "oklch(0.74 0.13 195)" /* lighter cyan drift suggests airflow */,
  },
  high_demand: {
    color: "oklch(0.64 0.21 25)" /* red pushed warm; urgency without breaking calm at 22% alpha */,
    colorTo: "oklch(0.62 0.20 40)" /* orange second stop ties it to the heating family */,
  },
  performance: {
    color: "oklch(0.62 0.18 300)" /* violet marks the boost mode apart from every heat hue */,
    colorTo: "oklch(0.60 0.17 315)" /* slight magenta drift keeps the gradient alive */,
  },
  off: {
    color:
      "oklch(0.65 0.02 250)" /* matches --tone-neutral light: calm grey-blue for inactive surfaces */,
    colorTo:
      "oklch(0.60 0.02 250)" /* slight darkening adds depth without breaking the neutral identity */,
  },
};

const MODE_COLORS_DARK: Record<string, { color: string; colorTo: string }> = {
  eco: {
    color: "oklch(0.76 0.17 145)" /* +0.04 L keeps the green vibrant at 22% alpha on dark bg */,
    colorTo: "oklch(0.74 0.16 160)" /* +0.04 L parity with the light variant */,
  },
  electric: {
    color:
      "oklch(0.82 0.15 85)" /* +0.04 L: amber needs the lift so it reads yellow, not olive, on dark */,
    colorTo: "oklch(0.80 0.16 65)" /* +0.04 L parity, chroma bump matches climate dry dark */,
  },
  gas: {
    color: "oklch(0.70 0.20 40)" /* +0.04 L over light keeps the flame orange warm on dark */,
    colorTo: "oklch(0.66 0.20 55)" /* +0.04 L parity for the amber stop */,
  },
  heat_pump: {
    color: "oklch(0.76 0.14 180)" /* +0.04 L lifts teal against dark bg */,
    colorTo: "oklch(0.78 0.13 195)" /* +0.04 L parity for the cyan drift */,
  },
  high_demand: {
    color: "oklch(0.68 0.21 25)" /* +0.04 L so the red registers on dark without going muddy */,
    colorTo: "oklch(0.66 0.20 40)" /* +0.04 L parity for the orange stop */,
  },
  performance: {
    color: "oklch(0.66 0.18 300)" /* +0.04 L keeps violet legible on dark */,
    colorTo: "oklch(0.64 0.17 315)" /* +0.04 L parity for the magenta drift */,
  },
  off: {
    color:
      "oklch(0.69 0.02 250)" /* matches --tone-neutral dark: +0.04 L over light, chroma parity */,
    colorTo: "oklch(0.64 0.02 250)" /* +0.04 L parity for the second stop */,
  },
};

/** Falls back to the neutral `off` pair for unknown or unavailable states. */
export function getModeColors(mode: string, dark: boolean): { color: string; colorTo: string } {
  const table = dark ? MODE_COLORS_DARK : MODE_COLORS_LIGHT;
  return table[mode] ?? table.off;
}
