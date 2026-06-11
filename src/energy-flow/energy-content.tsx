import { useWidgetContext } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, Match, Switch } from "solid-js";
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


  // Where the home's power is coming from, derived from the whole flow (not just
  // the grid) so a fully solar/battery-powered house reads its real story.
  const glanceState = createMemo(() => {
    const flow = props.flow;
    const net = netPower(flow);
    if (net < -50) return "exporting";
    const solarActive = flow.solar.watts > 0 && !flow.solarSleeping;
    const batteryDischarging = flow.battery.direction === "discharge";
    if (solarActive && flow.solar.watts >= flow.home.watts) return "on solar";
    if (batteryDischarging) return "on battery";
    if (solarActive) return "on solar";
    if (net > 50) return "from grid";
    return "idle";
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
                {formatPower(props.flow.home.watts)} · {glanceState()}
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

      <NodeDetail flow={props.flow} node={openNode()} onClose={() => setOpenNode(null)} />
    </div>
  );
}
