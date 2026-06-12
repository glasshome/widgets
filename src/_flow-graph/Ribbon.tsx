import { createMemo, createUniqueId, type JSX, Show } from "solid-js";
import { centerPath, ribbonPath } from "./geometry";
import type { PlacedEdge } from "./types";

/** Dash period of the flow stream (px along the path): one comet streak plus
 *  its gap. Offsetting by exactly one period loops seamlessly. */
const STREAM_DASH = "14 50";
const STREAM_PERIOD = 64;

const FLOW_MIN_DUR = 2;
const FLOW_MAX_DUR = 4;

/** Pulse travel time (s): faster for higher power, clamped. */
function flowDuration(value: number, max: number): number {
  if (max <= 0 || value <= 0) return FLOW_MAX_DUR;
  const ratio = Math.min(1, value / max);
  return FLOW_MAX_DUR - ratio * (FLOW_MAX_DUR - FLOW_MIN_DUR);
}

interface RibbonProps {
  placed: PlacedEdge;
  /** Largest magnitude on the canvas, so pulse speed is scaled consistently. */
  maxMagnitude: number;
  paused: boolean;
}

/**
 * One edge as a filled ribbon plus an optional stream of comet streaks running
 * along its centerline (a dashed stroke cycling its dash offset, so the motion
 * follows the curve). Idle or paused edges render the path alone.
 */
export function Ribbon(props: RibbonProps): JSX.Element {
  const uid = createUniqueId();
  const gradId = `grad-${uid}`;

  const edge = () => props.placed.edge;
  const from = () => props.placed.from;
  const to = () => props.placed.to;
  const path = createMemo(() => ribbonPath(from(), to()));
  const midY = (b: { top: number; bottom: number }) => (b.top + b.bottom) / 2;

  const animate = () => !edge().idle && !props.paused && edge().magnitude > 0;

  // The centerline runs from -> to; decreasing the dash offset moves streaks
  // toward the path end. Reverse edges (battery charge, grid export) flip it.
  const travel = () => (edge().direction === "forward" ? -STREAM_PERIOD : STREAM_PERIOD);

  // Streak thickness follows the ribbon's narrower band, capped so a fat
  // Sankey flow gets a slender light trail, not a flood.
  const streamWidth = () => {
    const h = Math.min(from().bottom - from().top, to().bottom - to().top);
    return Math.min(8, Math.max(2.5, h * 0.45));
  };

  return (
    <g>
      <linearGradient
        id={gradId}
        x1={`${from().x}`}
        y1={`${midY(from())}`}
        x2={`${to().x}`}
        y2={`${midY(to())}`}
        gradientUnits="userSpaceOnUse"
      >
        {/* stop-color via style: edge colors may be var()/relative-color CSS,
            which presentation attributes don't resolve. */}
        <stop offset="0" style={{ "stop-color": edge().color }} stop-opacity="0.9" />
        <stop
          offset="1"
          style={{ "stop-color": edge().colorTo ?? edge().color }}
          stop-opacity="0.82"
        />
      </linearGradient>
      <path d={path()} fill={`url(#${gradId})`} opacity={edge().idle ? 0.28 : 0.8} />
      <Show when={animate()}>
        <path
          class="flow-stream"
          d={centerPath(from(), to())}
          fill="none"
          stroke="#fff"
          stroke-opacity="0.45"
          stroke-width={streamWidth()}
          stroke-linecap="round"
          stroke-dasharray={STREAM_DASH}
          style={{
            "--flow-travel": `${travel()}`,
            "--flow-dur": `${flowDuration(edge().magnitude, props.maxMagnitude)}s`,
          }}
        />
      </Show>
    </g>
  );
}
