import type { EnergyRole } from "./colors";

/** Canonical icon per energy role (pure data; the HouseGlyph component lives in
 *  house-glyph.tsx so this stays DOM-free and server-test-safe). */
export const energyIcons: Record<EnergyRole, string> = {
  solar: "mdi:solar-power-variant",
  grid: "mdi:transmission-tower",
  battery: "mdi:battery-high",
  home: "mdi:home-lightning-bolt",
  export: "mdi:transmission-tower-import",
  ev: "mdi:car-electric",
};

// Symmetric pentagon house: roof peak at x=12, body from y=10 to y=21.
export const houseGlyphPath = "M12 3 L3 10 V21 H21 V10 Z";
