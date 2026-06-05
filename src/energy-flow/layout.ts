/**
 * Pure geometry + scaling math for the energy-flow topology.
 *
 * Coordinate space is a fixed 100x100 viewBox; the SVG scales to fit.
 * No SolidJS, no DOM — everything here is unit-testable.
 */

export type NodeId = "solar" | "grid" | "battery" | "home" | "ev";

export interface NodePoint {
  x: number;
  y: number;
}

/** Fixed node positions inside the 100x100 viewBox. */
export const NODE_POSITIONS: Record<NodeId, NodePoint> = {
  solar: { x: 50, y: 12 },
  grid: { x: 86, y: 50 },
  battery: { x: 14, y: 50 },
  home: { x: 50, y: 54 },
  ev: { x: 50, y: 90 },
};

export type Tier = "glance" | "mid" | "full";

/**
 * Pick the render tier from measured shell dimensions.
 *
 * - glance: too short for any topology — single headline line.
 * - mid: liquid-house glyph under the headline.
 * - full: full node topology with beams.
 */
export function selectTier(width: number, height: number): Tier {
  if (height < 150) return "glance";
  if (width >= 360 && height >= 300) return "full";
  return "mid";
}

const BEAM_MIN_WIDTH = 3;
const BEAM_MAX_WIDTH = 14;

/**
 * Stroke width for a beam, proportional to its power magnitude.
 *
 * Zero (a configured-but-idle path) renders at the minimum as a thin hint.
 * Scales linearly up to `maxValue`, capped at BEAM_MAX_WIDTH.
 */
export function beamWidth(value: number, maxValue: number): number {
  if (maxValue <= 0 || value <= 0) return BEAM_MIN_WIDTH;
  const ratio = Math.min(1, value / maxValue);
  return BEAM_MIN_WIDTH + ratio * (BEAM_MAX_WIDTH - BEAM_MIN_WIDTH);
}

const DOT_MIN_DUR = 1.5;
const DOT_MAX_DUR = 6;

/**
 * Travel duration (seconds) for a dot on a beam. Faster (shorter dur) for
 * higher power. Clamped to [DOT_MIN_DUR, DOT_MAX_DUR].
 */
export function dotDuration(value: number, maxValue: number): number {
  if (maxValue <= 0 || value <= 0) return DOT_MAX_DUR;
  const ratio = Math.min(1, value / maxValue);
  const dur = DOT_MAX_DUR - ratio * (DOT_MAX_DUR - DOT_MIN_DUR);
  return Math.max(DOT_MIN_DUR, Math.min(DOT_MAX_DUR, dur));
}

const MAX_DOTS = 3;

/**
 * How many traveling dots a beam should carry, and their `begin` offsets
 * (seconds) so they stagger evenly across the duration.
 */
export function dotSchedule(value: number, dur: number): number[] {
  if (value <= 0) return [];
  const count = value >= 2000 ? MAX_DOTS : value >= 600 ? 2 : 1;
  const begins: number[] = [];
  for (let i = 0; i < count; i++) {
    begins.push((dur / count) * i);
  }
  return begins;
}

/**
 * Build a refracting beam path from a source node to the home node.
 *
 * The beam is a two-segment polyline: it travels straight toward home, then
 * bends `angleDeg` at the crossing point (a fraction `bendAt` along the line)
 * to read as light refracting through the house outline.
 */
export function refractedBeamPath(
  from: NodePoint,
  to: NodePoint,
  angleDeg = 11,
  bendAt = 0.55,
): string {
  const mid = {
    x: from.x + (to.x - from.x) * bendAt,
    y: from.y + (to.y - from.y) * bendAt,
  };
  // Offset the bend point perpendicular to the line so the two segments
  // meet at a slight angle rather than forming a straight line.
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const offset = Math.tan((angleDeg * Math.PI) / 180) * (len * bendAt * 0.5);
  const bend = { x: mid.x + nx * offset, y: mid.y + ny * offset };
  return `M ${round(from.x)} ${round(from.y)} L ${round(bend.x)} ${round(bend.y)} L ${round(to.x)} ${round(to.y)}`;
}

/**
 * A direction chevron (small ">" arrowhead) placed at fraction `t` along the
 * straight from→to line, pointing toward `to`. Returns a 3-point polyline.
 */
export function chevronPoints(
  from: NodePoint,
  to: NodePoint,
  t: number,
  size = 2.5,
): string {
  const px = from.x + (to.x - from.x) * t;
  const py = from.y + (to.y - from.y) * t;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // Perpendicular for the two wings.
  const nx = -uy;
  const ny = ux;
  const tip = { x: px + ux * size, y: py + uy * size };
  const a = { x: px - nx * size, y: py - ny * size };
  const b = { x: px + nx * size, y: py + ny * size };
  return `${round(a.x)},${round(a.y)} ${round(tip.x)},${round(tip.y)} ${round(b.x)},${round(b.y)}`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
