import type { EnergyRole } from "./colors";

/** Canonical icon per energy role. Pure data, DOM-free, server-test-safe. */
export const energyIcons: Record<EnergyRole, string> = {
  solar: "mdi:solar-power-variant",
  grid: "mdi:transmission-tower",
  battery: "mdi:battery-high",
  home: "mdi:home-lightning-bolt",
  export: "mdi:transmission-tower-import",
  ev: "mdi:car-electric",
};
