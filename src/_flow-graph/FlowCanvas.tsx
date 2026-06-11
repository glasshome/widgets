import { type Accessor, createMemo, createUniqueId, Index, type JSX, Show } from "solid-js";
import { FlowNode } from "./FlowNode";
import { type ColumnsLayoutOpts, columnsLayout } from "./layout";
import { Ribbon, STREAM_PERIOD } from "./Ribbon";
import type { FlowGraph, FlowNode as FlowNodeData, Rect } from "./types";

/** Keyframes + reduced-motion fallback for every ribbon's shine. Inlined so it
 *  ships in the widget JS bundle (extracted .css is never loaded). */
const SHINE_CSS = `
@keyframes flow-shine { to { transform: translateX(var(--flow-travel, 0px)); } }
.flow-shine { animation: flow-shine var(--flow-dur, 3s) linear infinite; will-change: transform; }
@media (prefers-reduced-motion: reduce) { .flow-shine { animation: none; opacity: 0; } }
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
  // Canvas-scoped stream id: multiple canvases on a dashboard never collide.
  const streamId = `stream-${createUniqueId()}`;

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
          <style>{SHINE_CSS}</style>
          <defs>
            {/* One soft pulse per period, tiled. userSpaceOnUse + repeat means a
                one-period translate loops seamlessly across every ribbon. */}
            <linearGradient
              id={streamId}
              x1="0"
              y1="0"
              x2={`${STREAM_PERIOD}`}
              y2="0"
              gradientUnits="userSpaceOnUse"
              spreadMethod="repeat"
            >
              <stop offset="0" stop-color="#fff" stop-opacity="0" />
              <stop offset="0.42" stop-color="#fff" stop-opacity="0" />
              <stop offset="0.5" stop-color="#fff" stop-opacity="0.3" />
              <stop offset="0.58" stop-color="#fff" stop-opacity="0" />
              <stop offset="1" stop-color="#fff" stop-opacity="0" />
            </linearGradient>
          </defs>
          {/* Index (not For): reuse each ribbon's DOM across value ticks so the
              CSS shine keeps running instead of restarting from frame 0. */}
          <Index each={layout().edges}>
            {(placed) => (
              <Ribbon
                placed={placed()}
                canvasHeight={props.height}
                maxMagnitude={maxMagnitude()}
                streamId={streamId}
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
