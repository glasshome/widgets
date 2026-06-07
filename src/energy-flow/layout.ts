/**
 * Pure scaling + path math for the energy-flow spine.
 *
 * Coordinates are supplied by runtime measurement (getBoundingClientRect of the
 * HTML chips and hub, relative to the stage), so nothing here assumes a fixed
 * canvas. No SolidJS, no DOM — everything here is unit-testable.
 */

export type SourceId = "solar" | "battery" | "grid";
export type SpendId = "ev" | "home";

export interface Point {
  x: number;
  y: number;
}

export type Tier = "glance" | "mid" | "full";

/**
 * Pick the render tier from measured shell dimensions.
 *
 * - glance: too short for any topology — single headline line.
 * - mid: liquid-house glyph under the headline.
 * - full: the source → home → spend spine.
 */
export function selectTier(width: number, height: number): Tier {
  if (height < 150) return "glance";
  if (width >= 360 && height >= 300) return "full";
  return "mid";
}

/**
 * Smooth horizontal cubic bezier between two measured anchor points. Control
 * points sit at the horizontal midpoint so beams leave each endpoint flat and
 * curve through the middle, regardless of the vertical offset.
 */
export function beamPath(from: Point, to: Point): string {
  const midX = (from.x + to.x) / 2;
  const c1: Point = { x: midX, y: from.y };
  const c2: Point = { x: midX, y: to.y };
  return cubic(from, c1, c2, to);
}

function cubic(p0: Point, c1: Point, c2: Point, p1: Point): string {
  return `M ${r(p0.x)} ${r(p0.y)} C ${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${r(p1.x)} ${r(p1.y)}`;
}

/**
 * Closed Sankey ribbon between two vertical bands: a band of height
 * (y0bot - y0top) at x0 flowing to a band (y1bot - y1top) at x1. Top and bottom
 * edges are mirrored cubic beziers; tension controls the S-curve. Filled, this
 * is one proportional flow that stacks edge-to-edge with its neighbors.
 */
export function sankeyRibbon(
  x0: number,
  y0top: number,
  y0bot: number,
  x1: number,
  y1top: number,
  y1bot: number,
  tension = 0.5,
): string {
  const cx = (x1 - x0) * tension;
  return [
    `M ${r(x0)} ${r(y0top)}`,
    `C ${r(x0 + cx)} ${r(y0top)}, ${r(x1 - cx)} ${r(y1top)}, ${r(x1)} ${r(y1top)}`,
    `L ${r(x1)} ${r(y1bot)}`,
    `C ${r(x1 - cx)} ${r(y1bot)}, ${r(x0 + cx)} ${r(y0bot)}, ${r(x0)} ${r(y0bot)}`,
    "Z",
  ].join(" ");
}

const BEAM_MIN_WIDTH = 3;
const BEAM_MAX_WIDTH = 16;

/**
 * Stroke width for a beam, proportional to its power. Idle (≤0) renders at the
 * thin minimum as a static hint; scales linearly up to `maxValue`.
 */
export function beamWidth(value: number, maxValue: number): number {
  if (maxValue <= 0 || value <= 0) return BEAM_MIN_WIDTH;
  const ratio = Math.min(1, value / maxValue);
  return BEAM_MIN_WIDTH + ratio * (BEAM_MAX_WIDTH - BEAM_MIN_WIDTH);
}

const FLOW_MIN_DUR = 2;
const FLOW_MAX_DUR = 4;

/**
 * Dash-travel duration (seconds) for the flow overlay. Faster (shorter dur) for
 * higher power. Clamped to [FLOW_MIN_DUR, FLOW_MAX_DUR].
 */
export function flowDuration(value: number, maxValue: number): number {
  if (maxValue <= 0 || value <= 0) return FLOW_MAX_DUR;
  const ratio = Math.min(1, value / maxValue);
  const dur = FLOW_MAX_DUR - ratio * (FLOW_MAX_DUR - FLOW_MIN_DUR);
  return Math.max(FLOW_MIN_DUR, Math.min(FLOW_MAX_DUR, dur));
}

function r(n: number): number {
  return Math.round(n * 100) / 100;
}
