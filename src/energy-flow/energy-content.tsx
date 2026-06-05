import { useIntersectionPause, useReducedMotion, useWidgetContext } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, Match, onCleanup, Show, Switch } from "solid-js";
import { energyColors, formatPower } from "../_energy-shared";
import { type BeamSpec, Beams } from "./beams";
import { type EnergyFlow, netPower } from "./flow";
import { type NodeId, selectTier } from "./layout";
import { LiquidHouse } from "./liquid-house";
import { NodeDetail } from "./node-detail";
import { buildNodeViews, Nodes } from "./nodes";

interface EnergyContentProps {
  flow: EnergyFlow;
  headline: string;
}

/** Build the active beam list (one per configured source toward home). */
function buildBeams(flow: EnergyFlow): BeamSpec[] {
  const beams: BeamSpec[] = [];
  if (flow.solar.configured) {
    beams.push({ id: "solar", source: "solar", reversed: false, watts: flow.solar.watts, color: energyColors.solar });
  }
  if (flow.grid.configured) {
    // Import travels grid → home; export reverses to home → grid.
    beams.push({
      id: "grid",
      source: "grid",
      reversed: flow.grid.direction === "export",
      watts: flow.grid.watts,
      color: energyColors.grid,
    });
  }
  if (flow.battery.configured) {
    // Discharge feeds home; charge reverses (home/sources → battery).
    beams.push({
      id: "battery",
      source: "battery",
      reversed: flow.battery.direction === "charge",
      watts: flow.battery.watts,
      color: energyColors.battery,
    });
  }
  if (flow.ev.configured) {
    // EV consumes — energy travels home → ev.
    beams.push({ id: "ev", source: "ev", reversed: true, watts: flow.ev.watts, color: energyColors.battery });
  }
  return beams;
}

export function EnergyContent(props: EnergyContentProps) {
  const ctx = useWidgetContext();
  const reduced = useReducedMotion();

  const [root, setRoot] = createSignal<HTMLDivElement>();
  const offscreen = useIntersectionPause(root);

  const [hidden, setHidden] = createSignal(
    typeof document !== "undefined" ? document.hidden : false,
  );
  if (typeof document !== "undefined") {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    onCleanup(() => document.removeEventListener("visibilitychange", onVis));
  }

  const [openNode, setOpenNode] = createSignal<NodeId | null>(null);

  const tier = createMemo(() => {
    const d = ctx.dimensions();
    return selectTier(d.width, d.height);
  });

  const motionPaused = createMemo(() => reduced() || offscreen() || hidden());

  const beams = createMemo(() => buildBeams(props.flow));
  const views = createMemo(() => buildNodeViews(props.flow));
  const maxWatts = createMemo(() =>
    Math.max(1, ...beams().map((b) => b.watts), props.flow.home.watts),
  );

  const net = createMemo(() => netPower(props.flow));
  const glanceState = createMemo(() => {
    const n = net();
    if (n > 50) return "importing";
    if (n < -50) return "exporting";
    return "balanced";
  });

  return (
    <div ref={setRoot} class="relative h-full w-full" aria-label={props.headline}>
      <Switch>
        {/* --- Glance: one line, no chart --- */}
        <Match when={tier() === "glance"}>
          <div class="flex h-full items-center gap-2 px-1">
            <Icon icon="mdi:home-lightning-bolt" width={20} class="shrink-0 text-foreground/60" />
            <div class="flex min-w-0 flex-col leading-tight">
              <span class="truncate text-sm font-semibold tabular-nums text-foreground">
                {formatPower(Math.abs(net()))} · {glanceState()}
              </span>
              <span class="truncate text-[11px] text-foreground/50">{props.headline}</span>
            </div>
          </div>
        </Match>

        {/* --- Mid: liquid house under the headline --- */}
        <Match when={tier() === "mid"}>
          <div class="flex h-full flex-col gap-2 p-1">
            <span class="text-sm font-medium text-foreground/80">{props.headline}</span>
            <div class="min-h-0 flex-1">
              <LiquidHouse
                solarW={props.flow.solar.watts}
                batteryW={props.flow.battery.direction === "discharge" ? props.flow.battery.watts : 0}
                gridW={props.flow.grid.direction === "import" ? props.flow.grid.watts : 0}
              />
            </div>
          </div>
        </Match>

        {/* --- Full: node topology with beams --- */}
        <Match when={tier() === "full"}>
          <div class="flex h-full flex-col">
            <span class="px-2 pt-1 text-sm font-medium text-foreground/80">{props.headline}</span>
            <div class="relative min-h-0 flex-1">
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
                class="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                {/* House outline as a faint spatial frame. */}
                <path
                  d="M50 20 L20 40 V80 H80 V40 Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="0.6"
                  stroke-linejoin="round"
                  class="text-foreground"
                  opacity="0.1"
                />
                <Beams beams={beams()} maxWatts={maxWatts()} motionPaused={motionPaused()} />
              </svg>
              <Nodes views={views()} onTap={setOpenNode} />
            </div>
          </div>
        </Match>
      </Switch>

      <Show when={openNode()}>
        {(node) => (
          <NodeDetail flow={props.flow} node={node()} onClose={() => setOpenNode(null)} />
        )}
      </Show>
    </div>
  );
}
