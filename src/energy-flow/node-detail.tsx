import { Icon } from "@iconify-icon/solid";
import { Show } from "solid-js";
import { energyIcons, formatEnergy, formatPower } from "../_energy-shared";
import type { EnergyFlow } from "./flow";
import type { NodeId } from "./layout";

interface NodeDetailProps {
  flow: EnergyFlow;
  node: NodeId;
  onClose: () => void;
}

function nodeData(flow: EnergyFlow, node: NodeId) {
  switch (node) {
    case "solar":
      return { label: "Solar", icon: energyIcons.solar, watts: flow.solar.watts, soc: undefined };
    case "grid":
      return { label: "Grid", icon: energyIcons.grid, watts: flow.grid.watts, soc: undefined };
    case "battery":
      return {
        label: "Battery",
        icon: energyIcons.battery,
        watts: flow.battery.watts,
        soc: flow.battery.soc,
      };
    case "home":
      return { label: "Home", icon: energyIcons.home, watts: flow.home.watts, soc: undefined };
    case "ev":
      return { label: "EV", icon: energyIcons.ev, watts: flow.ev.watts, soc: flow.ev.soc };
  }
}

export function NodeDetail(props: NodeDetailProps) {
  const data = () => nodeData(props.flow, props.node);

  return (
    <div
      class="absolute inset-0 z-10 flex flex-col rounded-[inherit] bg-background/90 p-4 backdrop-blur-md"
      on:pointerdown={(e: PointerEvent) => e.stopPropagation()}
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Icon icon={data().icon} width={22} class="text-foreground/70" />
          <span class="text-sm font-semibold text-foreground">{data().label}</span>
        </div>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full text-foreground/50 hover:bg-foreground/10 hover:text-foreground"
          aria-label="Close"
          on:click={() => props.onClose()}
        >
          <Icon icon="mdi:close" width={18} />
        </button>
      </div>

      <div class="mt-3 flex items-baseline gap-3">
        <span class="text-3xl font-bold tabular-nums text-foreground">
          {formatPower(data().watts)}
        </span>
        <Show when={data().soc !== undefined}>
          <span class="text-sm tabular-nums text-foreground/50">
            {Math.round(data().soc ?? 0)}% charged
          </span>
        </Show>
      </div>

      {/* Today's energy + sparkline are wired in a later plan. */}
      <div class="mt-auto flex items-center justify-between text-xs text-foreground/40">
        <span>Today: {formatEnergy(0)}</span>
        <span class="italic">history coming soon</span>
      </div>
    </div>
  );
}
