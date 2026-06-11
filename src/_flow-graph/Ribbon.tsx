import { createMemo, createUniqueId, type JSX, Show } from "solid-js";
import { ribbonPath } from "./geometry";
import type { PlacedEdge } from "./types";

/** Spacing between light pulses in the flow stream (user px). The shine gradient
 *  repeats every period, so translating by exactly one period loops seamlessly. */
export const STREAM_PERIOD = 116;

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
  /** Full SVG height; the shine rect spans it and is clipped to the ribbon. */
  canvasHeight: number;
  /** Largest magnitude on the canvas, so pulse speed is scaled consistently. */
  maxMagnitude: number;
  /** Id of the shared, canvas-scoped stream gradient. */
  streamId: string;
  paused: boolean;
}

/**
 * One edge as a filled ribbon plus an optional traveling shine. Idle or paused
 * edges render the path alone. Self-contained: its own color gradient + clip live
 * inside the <g>; only the repeating stream gradient is shared by the canvas.
 */
export function Ribbon(props: RibbonProps): JSX.Element {
  const uid = createUniqueId();
  const gradId = `grad-${uid}`;
  const clipId = `clip-${uid}`;

  const edge = () => props.placed.edge;
  const from = () => props.placed.from;
  const to = () => props.placed.to;
  const path = createMemo(() => ribbonPath(from(), to()));
  const midY = (b: { top: number; bottom: number }) => (b.top + b.bottom) / 2;

  const animate = () => !edge().idle && !props.paused && edge().magnitude > 0;

  const xL = () => Math.min(from().x, to().x);
  const xR = () => Math.max(from().x, to().x);
  // Stream flows along from -> to; reverse edges (battery charge, grid export)
  // run the other way. Sign by x order keeps it correct regardless of layout.
  const travel = () => {
    const dir = edge().direction === "forward" ? 1 : -1;
    const sign = to().x >= from().x ? 1 : -1;
    return dir * sign * STREAM_PERIOD;
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
        <stop offset="0" stop-color={edge().color} stop-opacity="0.9" />
        <stop offset="1" stop-color={edge().colorTo ?? edge().color} stop-opacity="0.82" />
      </linearGradient>
      <path d={path()} fill={`url(#${gradId})`} opacity={edge().idle ? 0.28 : 0.8} />
      <Show when={animate()}>
        <clipPath id={clipId}>
          <path d={path()} />
        </clipPath>
        <g clip-path={`url(#${clipId})`}>
          <rect
            class="flow-shine"
            x={xL() - STREAM_PERIOD}
            y="0"
            width={xR() - xL() + STREAM_PERIOD * 2}
            height={props.canvasHeight}
            fill={`url(#${props.streamId})`}
            style={{
              "--flow-travel": `${travel()}px`,
              "--flow-dur": `${flowDuration(edge().magnitude, props.maxMagnitude)}s`,
            }}
          />
        </g>
      </Show>
    </g>
  );
}
