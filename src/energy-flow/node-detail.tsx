import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@glasshome/ui/solid";
import { Icon } from "@iconify-icon/solid";
import { createEffect, createMemo, createSignal, Show } from "solid-js";
import { energyIcons, formatEnergy, formatMoney, formatPower } from "../_energy-shared";
import { computeCost, type EnergyCost, type Tariff } from "./cost";
import type { EnergyFlow } from "./flow";

export type NodeDetailId = "solar" | "grid" | "battery" | "home" | "ev";

interface NodeDetailProps {
  flow: EnergyFlow;
  tariff: Tariff;
  node: NodeDetailId | null;
  onClose: () => void;
}

// Below this the rate rounds to 0.00/h, so we show nothing rather than "€0.00/h".
const COST_THRESHOLD = 0.005;

interface CostLine {
  /** Only when the value would otherwise read as a plain cost: export earnings
   *  and solar savings. Grid import cost is obvious under the node title. */
  label?: string;
  value: string;
}

/** A running cost/saving for the node, or null when the tariff is unset or the
 *  flow is too small to price. */
function costLine(node: NodeDetailId, cost: EnergyCost | null): CostLine | null {
  if (!cost) return null;
  const money = (amount: number) => `${formatMoney(amount, cost.currency)}/h`;
  if (node === "grid") {
    if (cost.gridPerHour > COST_THRESHOLD) return { value: money(cost.gridPerHour) };
    if (cost.gridPerHour < -COST_THRESHOLD)
      return { label: "Earning", value: money(cost.gridPerHour) };
    return null;
  }
  if (node === "solar" && cost.solarSavingPerHour > COST_THRESHOLD) {
    return { label: "Saving", value: money(cost.solarSavingPerHour) };
  }
  return null;
}

function nodeData(flow: EnergyFlow, node: NodeDetailId) {
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
  // Retain the last node through the close animation so the panel stays
  // populated while the dialog fades out (props.node clears immediately).
  const [shown, setShown] = createSignal<NodeDetailId | null>(props.node);
  createEffect(() => {
    if (props.node) setShown(props.node);
  });

  const cost = createMemo(() => computeCost(props.flow.flowState, props.tariff));

  const data = createMemo(() => {
    const node = props.node ?? shown();
    if (!node) return null;
    return { ...nodeData(props.flow, node), cost: costLine(node, cost()) };
  });

  return (
    <ResponsiveDialog
      open={props.node !== null}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <ResponsiveDialogContent class="max-w-sm">
        <Show when={data()}>
          {(d) => (
            <>
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle class="flex items-center gap-2">
                  <Icon icon={d().icon} width={22} class="text-foreground/70" />
                  {d().label}
                </ResponsiveDialogTitle>
              </ResponsiveDialogHeader>

              <div class="flex items-baseline gap-3">
                <span class="font-bold text-3xl text-foreground tabular-nums">
                  {formatPower(d().watts)}
                </span>
                <Show when={d().soc !== undefined}>
                  <span class="text-foreground/50 text-sm tabular-nums">
                    {Math.round(d().soc ?? 0)}% charged
                  </span>
                </Show>
              </div>

              <Show when={d().cost}>
                {(c) => (
                  <div class="mt-2 flex items-baseline gap-2 text-sm">
                    <Show when={c().label}>
                      <span class="text-foreground/50">{c().label}</span>
                    </Show>
                    <span class="font-medium text-foreground/80 tabular-nums">{c().value}</span>
                  </div>
                )}
              </Show>

              {/* Today's energy + sparkline are wired in a later plan. */}
              <div class="mt-6 flex items-center justify-between text-foreground/40 text-xs">
                <span>Today: {formatEnergy(0)}</span>
                <span class="italic">history coming soon</span>
              </div>
            </>
          )}
        </Show>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
