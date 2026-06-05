import { Icon } from "@iconify-icon/solid";
import { For, Show } from "solid-js";
import { energyColors, energyIcons, formatPower } from "../_energy-shared";
import type { EnergyFlow } from "./flow";
import { type NodeId, NODE_POSITIONS } from "./layout";

interface NodeView {
  id: NodeId;
  icon: string;
  label: string;
  sublabel?: string;
  watts: number;
  configured: boolean;
  stale: boolean;
  resting?: boolean;
  soc?: number;
  color: string;
}

function gridLabel(direction: "import" | "export" | "idle"): string {
  if (direction === "export") return "To grid";
  if (direction === "import") return "From grid";
  return "Grid";
}

export function buildNodeViews(flow: EnergyFlow): NodeView[] {
  const views: NodeView[] = [];

  if (flow.solar.configured) {
    views.push({
      id: "solar",
      icon: energyIcons.solar,
      label: "Solar",
      sublabel: flow.solarSleeping ? "Back at sunrise" : undefined,
      watts: flow.solar.watts,
      configured: true,
      stale: flow.solar.stale,
      resting: flow.solarSleeping,
      color: energyColors.solar,
    });
  }
  if (flow.grid.configured) {
    views.push({
      id: "grid",
      icon: flow.grid.direction === "export" ? energyIcons.export : energyIcons.grid,
      label: gridLabel(flow.grid.direction),
      watts: flow.grid.watts,
      configured: true,
      stale: flow.grid.stale,
      color: energyColors.grid,
    });
  }
  if (flow.battery.configured) {
    views.push({
      id: "battery",
      icon: energyIcons.battery,
      label: "Battery",
      watts: flow.battery.watts,
      configured: true,
      stale: flow.battery.stale,
      soc: flow.battery.soc,
      color: energyColors.battery,
    });
  }
  if (flow.home.configured) {
    views.push({
      id: "home",
      icon: energyIcons.home,
      label: "Home",
      watts: flow.home.watts,
      configured: true,
      stale: flow.home.stale,
      color: energyColors.home,
    });
  }
  if (flow.ev.configured) {
    views.push({
      id: "ev",
      icon: energyIcons.ev,
      label: "EV",
      watts: flow.ev.watts,
      configured: true,
      stale: flow.ev.stale,
      soc: flow.ev.soc,
      color: energyColors.battery,
    });
  }

  return views;
}

function Node(props: { view: NodeView; onTap: (id: NodeId) => void }) {
  const pos = () => NODE_POSITIONS[props.view.id];
  const valueText = () =>
    props.view.resting ? props.view.sublabel ?? "Resting" : formatPower(props.view.watts);

  return (
    <div
      class="absolute flex flex-col items-center justify-center"
      style={{
        left: `${pos().x}%`,
        top: `${pos().y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Expanded invisible hit area (>=44px) for touch. */}
      <button
        type="button"
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: "48px", height: "48px" }}
        aria-label={`${props.view.label}, ${valueText()}`}
        on:pointerdown={(e: PointerEvent) => e.stopPropagation()}
        on:click={() => props.onTap(props.view.id)}
      />
      <div
        class="flex h-11 w-11 items-center justify-center rounded-full border bg-background/70 shadow-[0_2px_8px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-opacity"
        classList={{ "opacity-40": props.view.stale || props.view.resting }}
        style={{
          "border-color": props.view.color,
          color: props.view.color,
        }}
      >
        <Icon icon={props.view.icon} width={22} />
        <Show when={props.view.stale}>
          <span class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-background bg-amber-400" />
        </Show>
      </div>
      <div class="mt-1 flex flex-col items-center leading-tight">
        <span class="text-[10px] font-medium text-foreground/60">{props.view.label}</span>
        <span class="text-xs font-semibold tabular-nums text-foreground">{valueText()}</span>
        <Show when={props.view.soc !== undefined}>
          <span class="text-[10px] tabular-nums text-foreground/50">
            {Math.round(props.view.soc ?? 0)}%
          </span>
        </Show>
      </div>
    </div>
  );
}

export function Nodes(props: { views: NodeView[]; onTap: (id: NodeId) => void }) {
  return (
    <For each={props.views}>{(view) => <Node view={view} onTap={props.onTap} />}</For>
  );
}
