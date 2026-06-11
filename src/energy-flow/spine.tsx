import { useIntersectionPause, useReducedMotion } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { type Accessor, createEffect, createMemo, createSignal, type JSX, onCleanup, Show } from "solid-js";
import type { FlowDescription } from "../_energy-shared";
import { FlowCanvas } from "../_flow-graph/FlowCanvas";
import type { FlowNode as FlowNodeData, Rect } from "../_flow-graph/types";
import type { EnergyFlow } from "./flow";
import { buildEnergyGraph, type NodeView, toDetailId } from "./graph-adapter";
import type { NodeDetailId } from "./node-detail";

/** Reserved top strip for the headline overlay; nodes center below it. */
const TOP_RESERVE = 56;

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

/** The central house hub: glyph + total consumption, over a soft glow in the
 *  dominant source color. */
function Hub(props: { view: NodeView | undefined; glow: string }): JSX.Element {
  return (
    <div class="relative flex h-full w-full items-center justify-center">
      <div
        class="pointer-events-none absolute h-[160%] w-[160%] rounded-full"
        style={{
          background: `radial-gradient(circle, color-mix(in oklch, ${props.glow} 8%, transparent) 0%, transparent 70%)`,
          filter: "blur(6px)",
        }}
        aria-hidden="true"
      />
      {/* Fill the node box so its edges match the layout rect the ribbons attach
          to (the ribbon ends tuck under this tile, like the chips). */}
      <div class="relative z-[1] flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl bg-foreground/[0.06] backdrop-blur-md">
        <svg
          viewBox="0 0 56 50"
          aria-hidden="true"
          class="block"
          style={{ width: "clamp(36px, 6cqi, 60px)", height: "clamp(32px, 5.4cqi, 54px)" }}
        >
          <path
            d="M28 4 L4 24 V46 H52 V24 Z"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linejoin="round"
            class="text-foreground/55"
          />
        </svg>
        <span
          class="font-semibold tabular-nums text-foreground"
          style={{ "font-size": "clamp(14px, 2.5cqi, 21px)" }}
        >
          {props.view?.value ?? ""}
        </span>
      </div>
    </div>
  );
}

export function Spine(props: {
  flow: EnergyFlow;
  description: FlowDescription;
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
        <Hub view={view()} glow={energy().hubGlow} />
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
          layoutOpts={{ topReserve: TOP_RESERVE }}
          renderNode={renderNode}
          onNodeTap={(id) => {
            const detail = toDetailId(id);
            if (detail) props.onTap(detail);
          }}
        />

        {/* Headline overlay, above the canvas in the reserved top strip. */}
        <div class="pointer-events-none absolute inset-x-0 top-0 z-[2] flex min-w-0 flex-col px-1 leading-tight">
          <span class="truncate font-semibold text-foreground" style={{ "font-size": "clamp(15px, 2.4cqi, 21px)" }}>
            {props.description.headline}
          </span>
          <Show when={props.description.detail}>
            <span class="truncate text-foreground/60" style={{ "font-size": "clamp(11px, 1.7cqi, 14px)" }}>
              {props.description.detail}
            </span>
          </Show>
        </div>
      </div>
    </div>
  );
}
