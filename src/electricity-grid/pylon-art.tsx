import { For } from "solid-js";
import pylonArt from "./assets/pylon.webp";
import "./pylon-art.css";

// Insulator tips in the photo's own box (0..1), left to right per arm.
export const TIPS: { x: number; y: number; side: -1 | 1 }[] = [
  { x: 0.028, y: 0.467, side: -1 },
  { x: 0.231, y: 0.261, side: -1 },
  { x: 0.236, y: 0.467, side: -1 },
  { x: 0.762, y: 0.261, side: 1 },
  { x: 0.759, y: 0.467, side: 1 },
  { x: 0.968, y: 0.467, side: 1 },
];

export const PYLON_ASPECT = 601 / 1095;

/** How many of the six wires carry the low-carbon colour. */
export function liveWires(lowCarbonPct: number): number {
  return Math.round((Math.min(100, Math.max(0, lowCarbonPct)) / 100) * TIPS.length);
}

/** A wire from its insulator tip out past the frame, in the photo's own box scaled by `sx`. */
export function wirePath(t: (typeof TIPS)[number], sx = 1): string {
  const endX = t.side < 0 ? -0.9 : 1.9;
  const sag = 0.1 + t.y * 0.08;
  const midX = (t.x + endX) / 2;
  return `M${t.x * sx} ${t.y} Q${midX * sx} ${t.y + sag} ${endX * sx} ${t.y - 0.02}`;
}

export function PylonArt(props: { lowCarbonPct: number; tint: string }) {
  const green = () => liveWires(props.lowCarbonPct);
  const wire = (t: (typeof TIPS)[number]) => wirePath(t);
  return (
    <div class="pylon-art">
      <svg class="pylon-wires" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
        <For each={TIPS}>
          {(t, i) => (
            <path
              d={wire(t)}
              class="pylon-wire"
              style={{ stroke: i() < green() ? props.tint : "var(--muted-foreground)" }}
              data-live={i() < green() || undefined}
            />
          )}
        </For>
      </svg>
      <img src={pylonArt} alt="" />
    </div>
  );
}
