/**
 * Domain-agnostic node/edge graph model + the geometry the layout engine emits.
 * No SolidJS, no DOM — everything here is pure data, unit-testable.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The one geometry unit: a vertical span [top, bottom] at a single x. A node
 *  port is a band; a stacked lane is a band; a ribbon connects two bands. */
export interface Band {
  x: number;
  top: number;
  bottom: number;
}

export type PortSide = "left" | "right" | "top" | "bottom";

/** A named attach point on one side of a node. Minimal in the column layout
 *  (which is kind-driven); richer layouts can resolve ports geometrically. */
export interface Port {
  id: string;
  side: PortSide;
}

/** Column-layout role. `source` -> left column, `spend` -> right column, `hub`
 *  -> centered. A future free-form layout could read explicit coordinates. */
export type NodeKind = "source" | "hub" | "spend";

export interface FlowNode {
  id: string;
  kind: NodeKind;
  ports?: Port[];
}

export interface PortRef {
  node: string;
  port?: string;
}

export interface FlowEdge {
  id: string;
  /** Source end. */
  from: PortRef;
  /** Target end. */
  to: PortRef;
  /** Power magnitude (W): drives ribbon width + animation speed. */
  magnitude: number;
  /** Color at the `from` end of the ribbon. */
  color: string;
  /** Color at the `to` end. Defaults to `color` (flat hue). Set it different
   *  from `color` to make ribbons converge to a shared color at one end. */
  colorTo?: string;
  /** Visual flow direction along the path (chip->hub vs hub->chip reads). */
  direction: "forward" | "reverse";
  /** Pure style hint (dim + no shine). No effect on geometry — a low-magnitude
   *  ribbon already renders thin via the min-width floor. */
  idle: boolean;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/** A node placed in pixel space by the layout engine. */
export interface PlacedNode {
  node: FlowNode;
  rect: Rect;
}

/** An edge resolved to a constant-width ribbon: a band at each endpoint. */
export interface PlacedEdge {
  edge: FlowEdge;
  from: Band;
  to: Band;
}

export interface PositionedGraph {
  width: number;
  height: number;
  nodes: PlacedNode[];
  edges: PlacedEdge[];
}
