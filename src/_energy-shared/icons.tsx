import type { JSX } from "solid-js";
import type { EnergyRole } from "./colors";

export const energyIcons: Record<EnergyRole | "ev", string> = {
  solar: "mdi:solar-power-variant",
  grid: "mdi:transmission-tower",
  battery: "mdi:battery-high",
  home: "mdi:home-lightning-bolt",
  export: "mdi:transmission-tower-import",
  ev: "mdi:car-electric",
};

export interface HouseGlyphProps {
  class?: string;
  style?: JSX.CSSProperties;
}

// Symmetric pentagon house: roof peak at x=12, body from y=10 to y=21.
export const houseGlyphPath = "M12 3 L3 10 V21 H21 V10 Z";

export function HouseGlyph(props: HouseGlyphProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
      aria-hidden="true"
      class={props.class}
      style={props.style}
    >
      <path d={houseGlyphPath} />
    </svg>
  );
}
