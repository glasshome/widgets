/**
 * Pure path + stacking math for the flow-graph renderer. Coordinates are pixel
 * space supplied by the layout engine. No SolidJS, no DOM.
 *
 * One primitive: a ribbon connects two bands. A "beam"/hint line is just a
 * ribbon at the min-width floor — there is no separate path type.
 */

import type { Band } from "./types";

/** Round to 2dp to keep emitted path strings compact and stable. */
function r(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Closed ribbon between two vertical bands: the band at `from.x` flows to the
 * band at `to.x`. Top and bottom edges are mirrored cubic beziers; `tension`
 * controls the S-curve. A thin band yields a hairline; a tall band yields a
 * Sankey flow. Same function either way.
 */
export function ribbonPath(from: Band, to: Band, tension = 0.5): string {
  const cx = (to.x - from.x) * tension;
  return [
    `M ${r(from.x)} ${r(from.top)}`,
    `C ${r(from.x + cx)} ${r(from.top)}, ${r(to.x - cx)} ${r(to.top)}, ${r(to.x)} ${r(to.top)}`,
    `L ${r(to.x)} ${r(to.bottom)}`,
    `C ${r(to.x - cx)} ${r(to.bottom)}, ${r(from.x + cx)} ${r(from.bottom)}, ${r(from.x)} ${r(from.bottom)}`,
    "Z",
  ].join(" ");
}

/** Open centerline of a ribbon: the band midpoints joined by the same cubic
 *  the ribbon edges use. Stroke-based flow animation runs along this path so
 *  the motion follows the ribbon's curve. */
export function centerPath(from: Band, to: Band, tension = 0.5): string {
  const cx = (to.x - from.x) * tension;
  const fy = (from.top + from.bottom) / 2;
  const ty = (to.top + to.bottom) / 2;
  return `M ${r(from.x)} ${r(fy)} C ${r(from.x + cx)} ${r(fy)}, ${r(to.x - cx)} ${r(ty)}, ${r(to.x)} ${r(ty)}`;
}

export interface Lane {
  id: string;
  /** Magnitude weight. */
  weight: number;
  /** Optional cap on a lane's width (e.g. a chip's straight edge). */
  max?: number;
}

/** A stacked lane's vertical span (a band without its x). */
export interface Span {
  top: number;
  bottom: number;
}

export interface StackOpts {
  /** Floor every lane gets, so a zero-weight ribbon still reads as a hairline. */
  minWidth: number;
  /** Fraction of `fullSpan` that lanes share by weight. */
  activeFraction: number;
}

/**
 * Stack weighted lanes within a span, centered on `center`, preserving input
 * order so neighbours never cross. Lanes share `activeFraction * fullSpan`
 * proportional to weight, each floored to `minWidth` and capped by `max`.
 * Returns each lane's [top, bottom] keyed by id.
 */
export function stackLanes(
  lanes: Lane[],
  center: number,
  fullSpan: number,
  opts: StackOpts,
): Map<string, Span> {
  const totalWeight = lanes.reduce((sum, l) => sum + Math.max(0, l.weight), 0) || 1;
  const fullH = fullSpan * opts.activeFraction;

  const widthOf = (l: Lane): number => {
    const share = (Math.max(0, l.weight) / totalWeight) * fullH;
    const w = Math.max(opts.minWidth, share);
    return l.max !== undefined ? Math.min(w, l.max) : w;
  };

  const widths = lanes.map(widthOf);
  const total = widths.reduce((a, b) => a + b, 0);

  const out = new Map<string, Span>();
  let cursor = center - total / 2;
  lanes.forEach((l, i) => {
    const top = cursor;
    const bottom = cursor + widths[i];
    out.set(l.id, { top, bottom });
    cursor = bottom;
  });
  return out;
}
