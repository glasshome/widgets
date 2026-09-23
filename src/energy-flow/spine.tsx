import { useDaylight, useIntersectionPause, useReducedMotion } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
  onCleanup,
  Show,
} from "solid-js";
import { formatPower } from "../_energy-shared";
import houseDay from "./assets/house-clay.webp";
import houseNight from "./assets/house-clay-night.webp";
import type { Tariff } from "./cost";
import { aggregate, type ResolvedFlow, type ResolvedNode } from "./flow";
import { buildEnergyGraph } from "./graph-adapter";
import { type LabelSide, layoutHouseScene, linkPath, type SceneRole } from "./house-scene";
import "./house.css";

const STREAM_CSS = `
@keyframes flow-stream { to { stroke-dashoffset: var(--flow-travel, -64); } }
.flow-stream { animation: flow-stream var(--flow-dur, 3s) linear infinite; }
@media (prefers-reduced-motion: reduce) { .flow-stream { animation: none; opacity: 0; } }
`;

function useDocumentHidden(): Accessor<boolean> {
  if (typeof document === "undefined") return () => false;
  const [hidden, setHidden] = createSignal(document.hidden);
  const onChange = () => setHidden(document.hidden);
  document.addEventListener("visibilitychange", onChange);
  onCleanup(() => document.removeEventListener("visibilitychange", onChange));
  return hidden;
}

const ROLE: Record<ResolvedNode["kind"], SceneRole> = {
  input: "roof",
  output: "wall-right",
  bidirectional: "base",
};

// Three steps only: a new duration restarts the animation, so small changes must not move it.
function streamSeconds(watts: number, max: number): number {
  return 4 - Math.round(Math.min(1, watts / (max || 1)) * 2);
}

function labelPosition(
  side: LabelSide,
  at: { x: number; y: number },
  width: number,
): JSX.CSSProperties {
  if (side === "bottom") return { left: `${at.x}px`, top: `${at.y}px` };
  if (side === "left") return { right: `${width - at.x}px`, top: `${at.y}px` };
  return { left: `${at.x}px`, top: `${at.y}px` };
}

export function Spine(props: {
  flow: ResolvedFlow;
  tariff: Tariff;
  onTap: (id: string) => void;
}): JSX.Element {
  const energy = createMemo(() => buildEnergyGraph(props.flow, props.tariff));
  const [el, setEl] = createSignal<HTMLDivElement>();
  const [size, setSize] = createSignal({ width: 0, height: 0 });
  createEffect(() => {
    const node = el();
    if (!node || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      const next = { width: Math.round(r.width), height: Math.round(r.height) };
      const prev = size();
      if (next.width !== prev.width || next.height !== prev.height) setSize(next);
    });
    ro.observe(node);
    onCleanup(() => ro.disconnect());
  });

  const reduced = useReducedMotion();
  const offscreen = useIntersectionPause(el);
  const hidden = useDocumentHidden();
  const paused = () => reduced() || offscreen() || hidden();
  const daylight = useDaylight();

  const placed = createMemo(() => props.flow.nodes.filter((n) => n.configured));
  const sceneNodes = createMemo(
    () => placed().map((n) => ({ id: n.id, role: ROLE[n.kind] })),
    undefined,
    {
      equals: (a, b) =>
        a.length === b.length && a.every((x, i) => x.id === b[i]?.id && x.role === b[i]?.role),
    },
  );
  const scene = createMemo(() => layoutHouseScene(sceneNodes(), size()));
  const edgeOf = (id: string) => energy().graph.edges.find((e) => e.id === id);
  const maxWatts = createMemo(() => Math.max(1, ...placed().map((n) => n.watts)));
  const glow = createMemo(() => Math.min(1, aggregate(props.flow.nodes).productionW / 4000));

  return (
    <div ref={setEl} class="flow-scene-box">
      <style>{STREAM_CSS}</style>
      <Show when={size().width > 0}>
        <svg class="flow-links" width={size().width} height={size().height} aria-hidden="true">
          <For each={scene().links}>
            {(link) => {
              const edge = () => edgeOf(link.id);
              const node = () => placed().find((n) => n.id === link.id);
              const toHouse = () => {
                const e = edge();
                const inbound = node()?.kind !== "output";
                return e?.direction === "forward" ? inbound : !inbound;
              };
              return (
                <Show when={edge() && !edge()?.idle}>
                  <path d={linkPath(link)} class="flow-link" style={{ stroke: edge()?.color }} />
                  <Show when={!paused()}>
                    <path
                      d={linkPath(link)}
                      class="flow-stream flow-link-stream"
                      style={{
                        "--flow-travel": `${toHouse() ? -64 : 64}`,
                        "--flow-dur": `${streamSeconds(node()?.watts ?? 0, maxWatts())}s`,
                      }}
                    />
                  </Show>
                </Show>
              );
            }}
          </For>
        </svg>
        <div
          class="flow-house-scene"
          role="img"
          aria-label={`Home, ${formatPower(props.flow.hubW)}`}
          style={{
            left: `${scene().house.x}px`,
            top: `${scene().house.y}px`,
            width: `${scene().house.w}px`,
            height: `${scene().house.h}px`,
          }}
        >
          <img src={houseDay} alt="" />
          <img
            src={houseNight}
            alt=""
            class="flow-house-night"
            data-visible={daylight().isNight || undefined}
          />
          <div class="flow-house-panels" style={{ opacity: glow() }} />
        </div>
        <For each={scene().labels}>
          {(label) => {
            const view = () => energy().views.get(label.id);
            return (
              <Show when={view()}>
                {(v) => (
                  <button
                    type="button"
                    class="flow-label"
                    data-side={label.side}
                    data-idle={v().idle || undefined}
                    style={labelPosition(label.side, label.at, size().width)}
                    onClick={() => props.onTap(label.id)}
                  >
                    <Icon
                      icon={v().icon}
                      class="flow-label-icon"
                      style={{ color: v().idle ? undefined : v().color }}
                    />
                    <span class="flow-label-text">
                      <span class="flow-label-value">{v().value}</span>
                      <span class="flow-label-name">{v().label}</span>
                    </span>
                  </button>
                )}
              </Show>
            );
          }}
        </For>
      </Show>
    </div>
  );
}
