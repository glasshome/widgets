import { Icon } from "@iconify-icon/solid";
import { createMemo, For, type JSX, Show } from "solid-js";
import { energyColors } from "../_energy-shared/colors";
import { formatPower } from "../_energy-shared/formatting";
import { computeCost, gridCostSub, solarSavingSub, type Tariff } from "./cost";
import { ACTIVE_THRESHOLD, type ResolvedFlow, type ResolvedNode } from "./flow";
import { type MixShare, sourceMix } from "./mix";

interface LegendItem {
  id: string;
  label: string;
  icon: string;
  color: string;
  value: string;
  active: boolean;
  sub?: string;
}

/** In-capable nodes (inputs and two-way) supply the home; outputs don't sit
 *  in the mix. */
function suppliers(flow: ResolvedFlow): ResolvedNode[] {
  return flow.nodes.filter((n) => n.configured && n.kind !== "output");
}

/** One legend entry per configured supplier; idle suppliers stay listed but
 *  dim, so the row teaches what the widget tracks even when nothing flows. The
 *  cost/saving sub-line mirrors the full-tier chips. */
function legendItems(flow: ResolvedFlow, tariff: Tariff): LegendItem[] {
  const cost = computeCost(flow.flowState, tariff);
  const inputs = flow.nodes.filter((n) => n.kind === "input" && n.configured);
  const soleInput = inputs.length === 1 ? inputs[0] : undefined;
  return suppliers(flow).map((node) => {
    const active = node.watts > ACTIVE_THRESHOLD && node.direction !== "idle";
    const exporting = node.priced && node.direction === "out";
    return {
      id: node.id,
      label: node.label,
      icon: node.icon,
      color: exporting ? energyColors.export : node.color,
      value: node.resting ? "resting" : active ? formatPower(node.watts) : "idle",
      active,
      sub:
        node.priced && active
          ? gridCostSub(cost)
          : node === soleInput
            ? solarSavingSub(cost)
            : undefined,
    };
  });
}

/** Segmented supply-mix bar + per-supplier legend (the mid-tier body). */
export function SourceMix(props: { flow: ResolvedFlow; tariff: Tariff }): JSX.Element {
  const shares = createMemo<MixShare[]>(() =>
    sourceMix(
      suppliers(props.flow).map((n) => ({
        id: n.id,
        watts: n.direction === "in" ? n.watts : 0,
      })),
    ),
  );
  const fraction = (id: string) => shares().find((s) => s.id === id)?.fraction ?? 0;
  // For over node ids keeps DOM nodes stable across data ticks, so the
  // flex-grow transition animates share changes instead of recreating pills.
  const activeIds = createMemo(() => shares().map((s) => s.id));
  const legend = createMemo(() => legendItems(props.flow, props.tariff));
  const colorOf = (id: string) =>
    legend().find((item) => item.id === id)?.color ?? energyColors.home;
  const barLabel = createMemo(() => {
    const s = shares();
    if (s.length === 0) return "No power flowing";
    const named = s.map((x) => {
      const label = legend().find((item) => item.id === x.id)?.label ?? x.id;
      return `${label} ${Math.round(x.fraction * 100)}%`;
    });
    return `Supply mix: ${named.join(", ")}`;
  });

  return (
    <div class="flex flex-col gap-2">
      <div class="flex h-2 w-full items-stretch gap-[3px]" role="img" aria-label={barLabel()}>
        <Show
          when={activeIds().length > 0}
          fallback={<div class="h-full w-full rounded-full bg-foreground/10" />}
        >
          <For each={activeIds()}>
            {(id) => (
              <div
                class="h-full min-w-[6px] rounded-full transition-[flex-grow] duration-200 ease-out motion-reduce:transition-none"
                style={{
                  "flex-grow": fraction(id),
                  "flex-basis": "0",
                  "background-color": colorOf(id),
                  "box-shadow": "inset 0 1px 0 color-mix(in oklch, white 35%, transparent)",
                }}
              />
            )}
          </For>
        </Show>
      </div>
      <div class="flex min-w-0 items-start gap-3">
        <For each={legend()}>
          {(item) => (
            <span
              class="flex min-w-0 items-start gap-1 text-xs tabular-nums transition-opacity"
              classList={{ "opacity-50": !item.active }}
            >
              <span class="sr-only">{item.label}</span>
              <Icon
                icon={item.icon}
                width={14}
                class="shrink-0"
                style={{ color: item.active ? item.color : "currentColor" }}
              />
              <span class="flex min-w-0 flex-col leading-tight">
                <span class="truncate text-foreground/70">{item.value}</span>
                <Show when={item.sub}>
                  <span class="truncate text-[10px] text-foreground/45">{item.sub}</span>
                </Show>
              </span>
            </span>
          )}
        </For>
      </div>
    </div>
  );
}
