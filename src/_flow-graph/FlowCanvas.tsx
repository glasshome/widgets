import { type Accessor, createMemo, Index, type JSX, Show } from "solid-js";
import { FlowNode } from "./FlowNode";
import { type ColumnsLayoutOpts, columnsLayout } from "./layout";
import { Ribbon } from "./Ribbon";
import type { FlowGraph, FlowNode as FlowNodeData, Rect } from "./types";

/** Keyframes + reduced-motion fallback for every ribbon's flow stream. Inlined
 *  so it ships in the widget JS bundle (extracted .css is never loaded). */
const STREAM_CSS = `
@keyframes flow-stream { to { stroke-dashoffset: var(--flow-travel, -64); } }
.flow-stream { animation: flow-stream var(--flow-dur, 3s) linear infinite; }
@media (prefers-reduced-motion: reduce) { .flow-stream { animation: none; opacity: 0; } }
`;

interface FlowCanvasProps {
  graph: FlowGraph;
  /** Container size, e.g. from a widget's reactive dimensions. */
  width: number;
  height: number;
  /** Stop all flow animation (offscreen / app backgrounded). */
  paused?: boolean;
  layoutOpts?: Partial<ColumnsLayoutOpts>;
  /** Render a node's content into its layout box. Receives reactive accessors so
   *  content updates on value ticks without the node re-mounting. */
  renderNode: (node: Accessor<FlowNodeData>, rect: Accessor<Rect>) => JSX.Element;
  onNodeTap?: (id: string) => void;
}

/**
 * Renders a positioned graph: an SVG ribbon layer behind an HTML node layer,
 * both driven by the same `columnsLayout` output in one coordinate space, so
 * edges meet nodes by construction (no measurement). Recomputes only when the
 * graph or container size changes.
 */
export function FlowCanvas(props: FlowCanvasProps): JSX.Element {
  const layout = createMemo(() =>
    columnsLayout(props.graph, props.width, props.height, props.layoutOpts ?? {}),
  );
  const maxMagnitude = createMemo(
    () => layout().edges.reduce((m, e) => Math.max(m, e.edge.magnitude), 0) || 1,
  );

  return (
    <Show when={props.width > 0 && props.height > 0}>
      <div class="relative h-full w-full">
        <svg
          class="pointer-events-none absolute inset-0"
          width={props.width}
          height={props.height}
          viewBox={`0 0 ${props.width} ${props.height}`}
          aria-hidden="true"
        >
          <style>{STREAM_CSS}</style>
          {/* Index (not For): reuse each ribbon's DOM across value ticks so the
              CSS stream keeps running instead of restarting from frame 0. */}
          <Index each={layout().edges}>
            {(placed) => (
              <Ribbon
                placed={placed()}
                maxMagnitude={maxMagnitude()}
                paused={props.paused ?? false}
              />
            )}
          </Index>
        </svg>

        <Index each={layout().nodes}>
          {(placed) => (
            <FlowNode
              rect={placed().rect}
              onTap={props.onNodeTap ? () => props.onNodeTap?.(placed().node.id) : undefined}
            >
              {props.renderNode(
                () => placed().node,
                () => placed().rect,
              )}
            </FlowNode>
          )}
        </Index>
      </div>
    </Show>
  );
}
