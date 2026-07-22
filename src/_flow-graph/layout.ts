/**
 * Column layout engine: places source/hub/spend nodes from container W x H and
 * resolves every edge to a constant-width ribbon. Pure — same input always
 * yields the same output. No SolidJS, no DOM.
 */

import { type Lane, type Span, stackLanes } from "./geometry";
import type {
  Band,
  FlowEdge,
  FlowGraph,
  PlacedEdge,
  PlacedNode,
  PositionedGraph,
  Rect,
} from "./types";

export interface ColumnsLayoutOpts {
  padding: number;
  /** Source/spend chip box width + height. */
  columnWidth: number;
  nodeHeight: number;
  nodeGap: number;
  /** Centered hub box. */
  hubWidth: number;
  hubHeight: number;
  /** Ribbons meet the hub slightly inside its edges. */
  hubInset: number;
  /** Active ribbons tuck under the opaque chip for a seamless seam. */
  chipOverlap: number;
  /** Per-lane cap = nodeHeight - laneCapInset (keeps the ribbon inside corners). */
  laneCapInset: number;
  /** Min width any ribbon gets, so a near-zero flow still reads as a hairline. */
  minRibbon: number;
  activeFraction: number;
  /** Minimum gap kept between each column's inner edge and the hub, so columns
   *  never overlap the hub on narrow canvases (columnWidth is clamped to fit). */
  minCorridor: number;
  /** Floor the clamped column width never drops below. */
  minColumnWidth: number;
  /** Vertical space reserved at the top (e.g. for a headline overlay); nodes
   *  center in the region below it. */
  topReserve: number;
  /** Strip at the top of the hub no ribbon may attach to (e.g. a shaped hub
   *  whose roof narrows toward the top). */
  hubAttachTop: number;
}

export const DEFAULT_COLUMNS_OPTS: ColumnsLayoutOpts = {
  padding: 12,
  columnWidth: 132,
  nodeHeight: 56,
  nodeGap: 16,
  hubWidth: 104,
  hubHeight: 92,
  hubInset: 10,
  chipOverlap: 6,
  laneCapInset: 18,
  minRibbon: 4,
  activeFraction: 0.8,
  minCorridor: 24,
  minColumnWidth: 80,
  topReserve: 0,
  hubAttachTop: 0,
};

interface Column {
  /** Inner-edge x where ribbons attach (right edge for sources, left for spend). */
  innerX: number;
  centers: Map<string, number>;
}

/** Stack a column's nodes vertically centered in [regionTop, regionTop+regionH]. */
function placeColumn(
  ids: string[],
  x: number,
  innerX: number,
  regionTop: number,
  regionH: number,
  o: ColumnsLayoutOpts,
  out: PlacedNode[],
  nodeOf: Map<string, PlacedNode["node"]>,
): Column {
  const n = ids.length;
  const total = n * o.nodeHeight + Math.max(0, n - 1) * o.nodeGap;
  const startY = regionTop + (regionH - total) / 2;
  const centers = new Map<string, number>();
  ids.forEach((id, i) => {
    const y = startY + i * (o.nodeHeight + o.nodeGap);
    const node = nodeOf.get(id);
    if (node) out.push({ node, rect: { x, y, w: o.columnWidth, h: o.nodeHeight } });
    centers.set(id, y + o.nodeHeight / 2);
  });
  return { innerX, centers };
}

export function columnsLayout(
  graph: FlowGraph,
  width: number,
  height: number,
  opts: Partial<ColumnsLayoutOpts> = {},
): PositionedGraph {
  const base: ColumnsLayoutOpts = { ...DEFAULT_COLUMNS_OPTS, ...opts };
  // Clamp column width so neither column overlaps the centered hub: each column
  // gets at most half of (width - hub - paddings - both corridors).
  const maxColumnWidth = (width - base.hubWidth - 2 * base.padding - 2 * base.minCorridor) / 2;
  const o: ColumnsLayoutOpts = {
    ...base,
    columnWidth: Math.max(base.minColumnWidth, Math.min(base.columnWidth, maxColumnWidth)),
  };
  const nodeOf = new Map(graph.nodes.map((n) => [n.id, n] as const));
  const placedNodes: PlacedNode[] = [];

  const sourceIds = graph.nodes.filter((n) => n.kind === "source").map((n) => n.id);
  const spendIds = graph.nodes.filter((n) => n.kind === "spend").map((n) => n.id);
  const hub = graph.nodes.find((n) => n.kind === "hub");

  const regionTop = o.topReserve;
  const regionH = height - o.topReserve;
  const left = placeColumn(
    sourceIds,
    o.padding,
    o.padding + o.columnWidth,
    regionTop,
    regionH,
    o,
    placedNodes,
    nodeOf,
  );
  const rightX = width - o.padding - o.columnWidth;
  const right = placeColumn(spendIds, rightX, rightX, regionTop, regionH, o, placedNodes, nodeOf);

  // Hub centers when it splits flow out to spend nodes on its right; with no
  // spend nodes it is the destination, so anchor it right (sources -> hub spans
  // the full width, giving long ribbons and no empty right column).
  const hubRect: Rect = {
    x: spendIds.length > 0 ? (width - o.hubWidth) / 2 : width - o.padding - o.hubWidth,
    y: regionTop + (regionH - o.hubHeight) / 2,
    w: o.hubWidth,
    h: o.hubHeight,
  };
  if (hub) placedNodes.push({ node: hub, rect: hubRect });
  const hubLeft = hubRect.x + o.hubInset;
  const hubRight = hubRect.x + hubRect.w - o.hubInset;
  const hubSpan = hubRect.h - o.hubAttachTop;
  const hubMidY = hubRect.y + o.hubAttachTop + hubSpan / 2;

  // Split edges by which hub side they attach to: source->hub on the left,
  // hub->spend on the right. Order follows the column's node order so stacked
  // lanes line up with their chips and never cross.
  const sourceEdges: FlowEdge[] = [];
  const spendEdges: FlowEdge[] = [];
  for (const id of sourceIds) {
    for (const e of graph.edges) if (e.from.node === id) sourceEdges.push(e);
  }
  for (const id of spendIds) {
    for (const e of graph.edges) if (e.to.node === id) spendEdges.push(e);
  }

  const laneCap = Math.max(o.minRibbon, o.nodeHeight - o.laneCapInset);
  const toLane = (e: FlowEdge): Lane => ({ id: e.id, weight: e.magnitude, max: laneCap });
  const stackOpts = { minWidth: o.minRibbon, activeFraction: o.activeFraction };

  const leftLanes = stackLanes(sourceEdges.map(toLane), hubMidY, hubSpan, stackOpts);
  const rightLanes = stackLanes(spendEdges.map(toLane), hubMidY, hubSpan, stackOpts);

  const placedEdges: PlacedEdge[] = [];

  // The hub lane IS the ribbon's hub-side band. The chip-side band is the same
  // height, centered on the chip and tucked under it by chipOverlap. Constant
  // width end-to-end; no idle special case (a thin lane reads as a hairline).
  const hubBand = (x: number, lane: Span): Band => ({ x, top: lane.top, bottom: lane.bottom });
  const chipBand = (centerY: number, innerX: number, dir: 1 | -1, lane: Span): Band => {
    const h = lane.bottom - lane.top;
    return { x: innerX - dir * o.chipOverlap, top: centerY - h / 2, bottom: centerY + h / 2 };
  };

  for (const e of sourceEdges) {
    const lane = leftLanes.get(e.id);
    const centerY = left.centers.get(e.from.node);
    if (!lane || centerY === undefined) continue;
    // Source edge flows chip -> hub: from = chip, to = hub-left.
    placedEdges.push({
      edge: e,
      from: chipBand(centerY, left.innerX, 1, lane),
      to: hubBand(hubLeft, lane),
    });
  }
  for (const e of spendEdges) {
    const lane = rightLanes.get(e.id);
    const centerY = right.centers.get(e.to.node);
    if (!lane || centerY === undefined) continue;
    // Spend edge flows hub -> chip: from = hub-right, to = chip.
    placedEdges.push({
      edge: e,
      from: hubBand(hubRight, lane),
      to: chipBand(centerY, right.innerX, -1, lane),
    });
  }

  return { width, height, nodes: placedNodes, edges: placedEdges };
}
