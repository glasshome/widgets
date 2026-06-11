import type { JSX } from "solid-js";
import { houseGlyphPath } from "./icons";

export interface HouseGlyphProps {
  class?: string;
  style?: JSX.CSSProperties;
}

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
