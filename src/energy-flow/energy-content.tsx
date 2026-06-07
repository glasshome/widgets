import { useWidgetContext } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, Match, Show, Switch } from "solid-js";
import type { FlowDescription } from "../_energy-shared";
import { formatPower } from "../_energy-shared";
import { type EnergyFlow, netPower } from "./flow";
import { selectTier } from "./layout";
import { LiquidHouse } from "./liquid-house";
import { NodeDetail, type NodeDetailId } from "./node-detail";
import { Spine } from "./spine";

interface EnergyContentProps {
  flow: EnergyFlow;
  description: FlowDescription;
}

export function EnergyContent(props: EnergyContentProps) {
  const ctx = useWidgetContext();

  const [openNode, setOpenNode] = createSignal<NodeDetailId | null>(null);

  const tier = createMemo(() => {
    const d = ctx.dimensions();
    return selectTier(d.width, d.height);
  });


  const net = createMemo(() => netPower(props.flow));
  const glanceState = createMemo(() => {
    const n = net();
    if (n > 50) return "importing";
    if (n < -50) return "exporting";
    return "balanced";
  });

  return (
    <div class="relative h-full w-full" aria-label={props.description.headline}>
      <Switch>
        {/* --- Glance: one line, no chart --- */}
        <Match when={tier() === "glance"}>
          <div class="flex h-full items-center gap-2 px-1">
            <Icon icon="mdi:home-lightning-bolt" width={20} class="shrink-0 text-foreground/60" />
            <div class="flex min-w-0 flex-col leading-tight">
              <span class="truncate text-sm font-semibold tabular-nums text-foreground">
                {formatPower(Math.abs(net()))} · {glanceState()}
              </span>
              <span class="truncate text-[11px] text-foreground/50">
                {props.description.headline}
              </span>
            </div>
          </div>
        </Match>

        {/* --- Mid: liquid house under the headline --- */}
        <Match when={tier() === "mid"}>
          <div class="flex h-full flex-col gap-2 p-1">
            <span class="text-sm font-medium text-foreground/80">{props.description.headline}</span>
            <div class="min-h-0 flex-1">
              <LiquidHouse
                solarW={props.flow.solar.watts}
                batteryW={props.flow.battery.direction === "discharge" ? props.flow.battery.watts : 0}
                gridW={props.flow.grid.direction === "import" ? props.flow.grid.watts : 0}
              />
            </div>
          </div>
        </Match>

        {/* --- Full: the source → home → spend spine --- */}
        <Match when={tier() === "full"}>
          <Spine
            flow={props.flow}
            description={props.description}
            onTap={setOpenNode}
          />
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
