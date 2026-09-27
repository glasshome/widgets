type PortSide = "left" | "right" | "top" | "bottom";

/** A named attach point on one side of a node. Minimal in the column layout
 *  (which is kind-driven); richer layouts can resolve ports geometrically. */
interface Port {
  id: string;
  side: PortSide;
}

/** Column-layout role. `source` -> left column, `spend` -> right column, `hub`
 *  -> centered. A future free-form layout could read explicit coordinates. */
type NodeKind = "source" | "hub" | "spend";

export interface FlowNode {
  id: string;
  kind: NodeKind;
  ports?: Port[];
}

interface PortRef {
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
