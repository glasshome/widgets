import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createEffect, createMemo, createSignal, Show } from "solid-js";
import { energyIcons, formatEnergy, formatMoney, formatPower } from "../_energy-shared";
import { computeCost, type EnergyCost, type Tariff } from "./cost";
import type { ResolvedFlow, ResolvedNode } from "./flow";

interface NodeDetailProps {
  flow: ResolvedFlow;
  tariff: Tariff;
  /** Graph node id ("hub" opens the home detail); null = closed. */
  node: string | null;
  onClose: () => void;
}

// Below this the rate rounds to 0.00/h, so we show nothing rather than "€0.00/h".
const COST_THRESHOLD = 0.005;

interface CostLine {
  /** Only when the value would otherwise read as a plain cost: export earnings
   *  and self-consumption savings. Import cost is obvious under the node title. */
  label?: string;
  value: string;
}

/** A running cost/saving for the node, or null when the tariff is unset or the
 *  flow is too small to price. */
function costLine(
  node: ResolvedNode | undefined,
  soleInput: ResolvedNode | undefined,
  cost: EnergyCost | null,
): CostLine | null {
  if (!cost || !node) return null;
  const money = (amount: number) => `${formatMoney(amount, cost.currency)}/h`;
  if (node.priced) {
    if (cost.gridPerHour > COST_THRESHOLD) return { value: money(cost.gridPerHour) };
    if (cost.gridPerHour < -COST_THRESHOLD)
      return { label: "Earning", value: money(cost.gridPerHour) };
    return null;
  }
  if (node === soleInput && cost.solarSavingPerHour > COST_THRESHOLD) {
    return { label: "Saving", value: money(cost.solarSavingPerHour) };
  }
  return null;
}

export function NodeDetail(props: NodeDetailProps) {
  // Retain the last node through the close animation so the panel stays
  // populated while the dialog fades out (props.node clears immediately).
  const [shown, setShown] = createSignal<string | null>(props.node);
  createEffect(() => {
    if (props.node) setShown(props.node);
  });

  const cost = createMemo(() => computeCost(props.flow.flowState, props.tariff));

  const data = createMemo(() => {
    const id = props.node ?? shown();
    if (!id) return null;
    if (id === "hub") {
      return {
        label: "Home",
        icon: energyIcons.home,
        watts: props.flow.hubW,
        level: undefined,
        cost: null,
      };
    }
    const node = props.flow.nodes.find((n) => n.id === id);
    if (!node) return null;
    const inputs = props.flow.nodes.filter((n) => n.kind === "input" && n.configured);
    const soleInput = inputs.length === 1 ? inputs[0] : undefined;
    return {
      label: node.label,
      icon: node.icon,
      watts: node.watts,
      level: node.level,
      cost: costLine(node, soleInput, cost()),
    };
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
                <Show when={d().level !== undefined}>
                  <span class="text-foreground/50 text-sm tabular-nums">
                    {Math.round(d().level ?? 0)}% charged
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
