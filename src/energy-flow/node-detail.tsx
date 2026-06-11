import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@glasshome/ui/solid";
import { Icon } from "@iconify-icon/solid";
import { createEffect, createMemo, createSignal, Show } from "solid-js";
import { energyIcons, formatEnergy, formatPower } from "../_energy-shared";
import type { EnergyFlow } from "./flow";

export type NodeDetailId = "solar" | "grid" | "battery" | "home" | "ev";

interface NodeDetailProps {
  flow: EnergyFlow;
  node: NodeDetailId | null;
  onClose: () => void;
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

  const data = createMemo(() => {
    const node = props.node ?? shown();
    return node ? nodeData(props.flow, node) : null;
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
                <span class="text-3xl font-bold tabular-nums text-foreground">
                  {formatPower(d().watts)}
                </span>
                <Show when={d().soc !== undefined}>
                  <span class="text-sm tabular-nums text-foreground/50">
                    {Math.round(d().soc ?? 0)}% charged
                  </span>
                </Show>
              </div>

              {/* Today's energy + sparkline are wired in a later plan. */}
              <div class="mt-6 flex items-center justify-between text-xs text-foreground/40">
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
