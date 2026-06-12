import { useIntersectionPause, useReducedMotion } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  type JSX,
  onCleanup,
  Show,
} from "solid-js";
import { FlowCanvas } from "../_flow-graph/FlowCanvas";
import type { FlowNode as FlowNodeData, Rect } from "../_flow-graph/types";
import type { EnergyFlow } from "./flow";
import { buildEnergyGraph, type NodeView, toDetailId } from "./graph-adapter";
import type { NodeDetailId } from "./node-detail";

/** True while the document is hidden (tab switched, app backgrounded). Covers the
 *  Capacitor WebView, which fires visibilitychange on app-state changes, without
 *  pulling a Capacitor dependency into the widget bundle. */
function useDocumentHidden(): Accessor<boolean> {
  if (typeof document === "undefined") return () => false;
  const [hidden, setHidden] = createSignal(document.hidden);
  const onChange = () => setHidden(document.hidden);
  document.addEventListener("visibilitychange", onChange);
  onCleanup(() => document.removeEventListener("visibilitychange", onChange));
  return hidden;
}

/** A source/spend node's content, filling its layout box. The role color is
 *  carried by the glyph; the box is a neutral themed sub-card. */
function Chip(props: { view: NodeView | undefined; align: "left" | "right" }): JSX.Element {
  return (
    <Show when={props.view}>
      {(v) => (
        <div
          class="flex h-full w-full items-center rounded-lg border border-border bg-card transition-opacity"
          classList={{
            "opacity-50": v().idle,
            "flex-row-reverse text-right": props.align === "right",
          }}
          style={{ gap: "clamp(8px, 1.3cqi, 12px)", padding: "0 clamp(9px, 1.5cqi, 14px)" }}
          aria-label={`${v().label}, ${v().value}`}
        >
          <Icon
            icon={v().icon}
            class="shrink-0"
            style={{
              color: v().idle ? "currentColor" : v().color,
              "font-size": "clamp(20px, 3.2cqi, 30px)",
            }}
          />
          <span class="flex min-w-0 flex-col leading-tight">
            <span class="truncate text-foreground/55" style={{ "font-size": "clamp(11px, 1.7cqi, 14px)" }}>
              {v().label}
            </span>
            <span
              class="truncate font-semibold tabular-nums text-foreground"
              style={{ "font-size": "clamp(15px, 2.7cqi, 23px)" }}
            >
              {v().value}
            </span>
          </span>
        </div>
      )}
    </Show>
  );
}

/** Same auto-contrast formula as the SDK icon tile: light text on a dark fill,
 *  dark text on a light fill, in either theme. */
const HOUSE_TEXT =
  "oklch(from var(--widget-color) calc(0.52 + sign(0.5 - l) * 0.43) calc(c * 0.2) h)";

/** Pentagon inset 8 viewBox-units inside the node box; the 16-wide stroke
 *  centered on it reaches back out to the box edge and its round joins give
 *  the 8px corner radius. Eaves sit at y=42 — keep `hubAttachTop` in sync so
 *  ribbons attach below the roofline. */
const HOUSE_PATH = "M52 8 L96 42 V84 H8 V42 Z";

/** The central hub: a house-shaped tile in the dominant source color (the
 *  widget channel), carrying total home consumption. The silhouette fills the
 *  node box so the ribbon ends tuck under its walls. */
function Hub(props: { view: NodeView | undefined }): JSX.Element {
  const sheenId = `house-sheen-${createUniqueId()}`;
  return (
    <div class="relative h-full w-full" aria-label={`Home, ${props.view?.value ?? ""}`}>
      <svg
        class="absolute inset-0 h-full w-full"
        viewBox="0 0 104 92"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{
          filter:
            "drop-shadow(0 0 14px color-mix(in oklch, var(--widget-color) 40%, transparent))",
        }}
      >
        <defs>
          {/* Top-down white sheen over the fill: the same glass highlight the
              widget shell carries via --widget-border-highlight. */}
          <linearGradient id={sheenId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fff" stop-opacity="0.32" />
            <stop offset="0.55" stop-color="#fff" stop-opacity="0.06" />
            <stop offset="1" stop-color="#fff" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path
          d={HOUSE_PATH}
          fill="var(--widget-color)"
          stroke="var(--widget-color)"
          stroke-width="16"
          stroke-linejoin="round"
        />
        <path
          d={HOUSE_PATH}
          fill={`url(#${sheenId})`}
          stroke={`url(#${sheenId})`}
          stroke-width="16"
          stroke-linejoin="round"
        />
      </svg>
      {/* Center the reading in the house body, below the roofline. */}
      <div
        class="absolute inset-x-0 top-[42%] bottom-0 z-[1] flex items-center justify-center"
        style={{ color: HOUSE_TEXT }}
      >
        <span
          class="font-bold tabular-nums"
          style={{ "font-size": "clamp(19px, 3.8cqi, 30px)" }}
        >
          {props.view?.value ?? ""}
        </span>
      </div>
    </div>
  );
}

export function Spine(props: {
  flow: EnergyFlow;
  onTap: (id: NodeDetailId) => void;
}): JSX.Element {
  const energy = createMemo(() => buildEnergyGraph(props.flow));

  // One ResizeObserver on the canvas box feeds the pure layout. This is the only
  // measurement: a single stable container, not per-node anchor chasing.
  const [canvasEl, setCanvasEl] = createSignal<HTMLDivElement>();
  const [size, setSize] = createSignal({ w: 0, h: 0 });
  createEffect(() => {
    const el = canvasEl();
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    onCleanup(() => ro.disconnect());
  });

  // FLOW-07: stop ribbon animation when the user prefers reduced motion, the
  // widget is scrolled offscreen, or the app/tab is hidden (saves battery).
  const reduced = useReducedMotion();
  const offscreen = useIntersectionPause(canvasEl);
  const hidden = useDocumentHidden();
  const paused = () => reduced() || offscreen() || hidden();

  const renderNode = (node: Accessor<FlowNodeData>, _rect: Accessor<Rect>): JSX.Element => {
    const view = () => energy().views.get(node().id);
    return (
      <Show
        when={node().kind === "hub"}
        fallback={<Chip view={view()} align={node().kind === "source" ? "left" : "right"} />}
      >
        <Hub view={view()} />
      </Show>
    );
  };

  return (
    // No padding here: Widget.Content already applies --widget-pad. Adding it
    // again double-insets the canvas and wastes the widget's width/height.
    <div class="relative h-full w-full">
      <div ref={setCanvasEl} class="relative h-full w-full">
        <FlowCanvas
          graph={energy().graph}
          width={size().w}
          height={size().h}
          paused={paused()}
          // Tuck ribbon ends deeper under the hub and keep them attached
          // below the house silhouette's roofline (eaves at y=42, minus the
          // stroke bulge).
          layoutOpts={{ hubInset: 18, hubAttachTop: 40 }}
          renderNode={renderNode}
          onNodeTap={(id) => {
            const detail = toDetailId(id);
            if (detail) props.onTap(detail);
          }}
        />
      </div>
    </div>
  );
}
