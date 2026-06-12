import { Icon } from "@iconify-icon/solid";
import { createMemo, For, type JSX, Show } from "solid-js";
import { energyColors } from "../_energy-shared/colors";
import { formatPower } from "../_energy-shared/formatting";
import { energyIcons } from "../_energy-shared/icons";
import { ACTIVE_THRESHOLD, type EnergyFlow } from "./flow";
import { type MixRole, sourceMix } from "./mix";

interface LegendItem {
  role: MixRole;
  icon: string;
  color: string;
  value: string;
  active: boolean;
}

/** One legend entry per configured source; idle sources stay listed but dim,
 *  so the row teaches what the widget tracks even when nothing flows. */
function legendItems(flow: EnergyFlow): LegendItem[] {
  const items: LegendItem[] = [];
  if (flow.solar.configured) {
    const active = flow.solar.watts > ACTIVE_THRESHOLD;
    items.push({
      role: "solar",
      icon: energyIcons.solar,
      color: energyColors.solar,
      value: flow.solarSleeping ? "resting" : active ? formatPower(flow.solar.watts) : "idle",
      active,
    });
  }
  if (flow.battery.configured) {
    const charging = flow.battery.direction === "charge";
    const active = flow.battery.watts > ACTIVE_THRESHOLD && flow.battery.direction !== "idle";
    items.push({
      role: "battery",
      icon: energyIcons.battery,
      color: energyColors.battery,
      value: !active ? "idle" : charging ? "charging" : formatPower(flow.battery.watts),
      active,
    });
  }
  if (flow.grid.configured) {
    const exporting = flow.grid.direction === "export";
    const active = flow.grid.watts > ACTIVE_THRESHOLD && flow.grid.direction !== "idle";
    items.push({
      role: "grid",
      icon: exporting ? energyIcons.export : energyIcons.grid,
      color: exporting ? energyColors.export : energyColors.grid,
      value: active ? formatPower(flow.grid.watts) : "idle",
      active,
    });
  }
  return items;
}

/** Segmented supply-mix bar + per-source legend (the mid-tier body). */
export function SourceMix(props: { flow: EnergyFlow }): JSX.Element {
  const shares = createMemo(() =>
    sourceMix({
      solarW: props.flow.solar.watts,
      batteryW: props.flow.battery.direction === "discharge" ? props.flow.battery.watts : 0,
      gridW: props.flow.grid.direction === "import" ? props.flow.grid.watts : 0,
    }),
  );
  const fraction = (role: MixRole) => shares().find((s) => s.role === role)?.fraction ?? 0;
  // For over role strings keeps DOM nodes stable across data ticks, so the
  // flex-grow transition animates share changes instead of recreating pills.
  const activeRoles = createMemo(() => shares().map((s) => s.role));
  const legend = createMemo(() => legendItems(props.flow));
  const barLabel = createMemo(() => {
    const s = shares();
    if (s.length === 0) return "No power flowing";
    return `Supply mix: ${s.map((x) => `${x.role} ${Math.round(x.fraction * 100)}%`).join(", ")}`;
  });

  return (
    <div class="flex flex-col gap-2">
      <div class="flex h-2 w-full items-stretch gap-[3px]" role="img" aria-label={barLabel()}>
        <Show
          when={activeRoles().length > 0}
          fallback={<div class="h-full w-full rounded-full bg-foreground/10" />}
        >
          <For each={activeRoles()}>
            {(role) => (
              <div
                class="h-full min-w-[6px] rounded-full transition-[flex-grow] duration-200 ease-out motion-reduce:transition-none"
                style={{
                  "flex-grow": fraction(role),
                  "flex-basis": "0",
                  "background-color": energyColors[role],
                  "box-shadow": "inset 0 1px 0 color-mix(in oklch, white 35%, transparent)",
                }}
              />
            )}
          </For>
        </Show>
      </div>
      <div class="flex min-w-0 items-center gap-3">
        <For each={legend()}>
          {(item) => (
            <span
              class="flex min-w-0 items-center gap-1 text-xs tabular-nums transition-opacity"
              classList={{ "opacity-50": !item.active }}
              aria-label={`${item.role}: ${item.value}`}
            >
              <Icon
                icon={item.icon}
                width={14}
                class="shrink-0"
                style={{ color: item.active ? item.color : "currentColor" }}
              />
              <span class="truncate text-foreground/70">{item.value}</span>
            </span>
          )}
        </For>
      </div>
    </div>
  );
}
