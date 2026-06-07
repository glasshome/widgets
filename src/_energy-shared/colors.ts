export { type SvgColorKey, svgColors } from "@glasshome/widget-sdk";

export const energyColors = {
  solar: "var(--tone-accent)",
  grid: "oklch(0.62 0.12 245)",
  battery: "var(--tone-success)",
  home: "oklch(0.68 0.06 250)",
  ev: "oklch(0.70 0.14 190)",
  export: "oklch(0.70 0.14 160)",
} as const;

export type EnergyRole = keyof typeof energyColors;
