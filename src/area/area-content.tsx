import { Icon } from "@iconify-icon/solid";
import { For, Show } from "solid-js";
import type { AreaMetrics, EntityGroups } from "./utils";
import { getAreaIcon } from "./utils";

interface AreaContentProps {
  metrics: AreaMetrics;
  groups: EntityGroups;
  areaName: string;
  size: string;
}

function DomainChip(props: { label: string; count: number }) {
  return (
    <span class="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-muted-foreground text-xs">
      {props.count} {props.label}
    </span>
  );
}

export function AreaContent(props: AreaContentProps) {
  const isCompact = () => props.size === "xs" || props.size === "sm";
  const isMedium = () => props.size === "md";
  const isLarge = () => props.size === "lg" || props.size === "xl";

  const activeAlertNames = () =>
    props.groups.binarySensors.filter((e) => e.state === "on").map((e) => e.friendlyName);

  return (
    <div class="flex flex-col gap-1.5 overflow-hidden">
      {/* Compact: icon + name + lights badge */}
      <div class="flex items-center gap-2">
        <Icon icon={getAreaIcon(props.metrics)} width={18} class="shrink-0 text-muted-foreground" />
        <span class="truncate font-medium text-sm">{props.areaName}</span>
        <Show when={props.metrics.lightsTotal > 0}>
          <span class="ml-auto shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-primary text-xs">
            {props.metrics.lightsOn}/{props.metrics.lightsTotal}
          </span>
        </Show>
      </div>

      {/* Medium: metrics row */}
      <Show when={!isCompact()}>
        <div class="flex items-center gap-3 text-muted-foreground text-xs">
          <Show when={props.metrics.temperature !== null}>
            <span class="flex items-center gap-1">
              <Icon icon="mdi:thermometer" width={14} />
              {props.metrics.temperature}°
            </span>
          </Show>
          <Show when={props.metrics.humidity !== null}>
            <span class="flex items-center gap-1">
              <Icon icon="mdi:water-percent" width={14} />
              {props.metrics.humidity}%
            </span>
          </Show>
          <Show when={props.metrics.alertCount > 0}>
            <span class="flex items-center gap-1 text-destructive">
              <Icon icon="mdi:alert-circle" width={14} />
              {props.metrics.alertCount}
            </span>
          </Show>
        </div>
      </Show>

      {/* Large: domain chips + alert names */}
      <Show when={isLarge()}>
        <div class="flex flex-wrap gap-1">
          <Show when={props.groups.lights.length > 0}>
            <DomainChip label="lights" count={props.groups.lights.length} />
          </Show>
          <Show when={props.groups.sensors.length > 0}>
            <DomainChip label="sensors" count={props.groups.sensors.length} />
          </Show>
          <Show when={props.groups.climate.length > 0}>
            <DomainChip label="climate" count={props.groups.climate.length} />
          </Show>
          <Show when={props.groups.covers.length > 0}>
            <DomainChip label="covers" count={props.groups.covers.length} />
          </Show>
          <Show when={props.groups.switches.length > 0}>
            <DomainChip label="switches" count={props.groups.switches.length} />
          </Show>
          <Show when={props.groups.binarySensors.length > 0}>
            <DomainChip label="sensors" count={props.groups.binarySensors.length} />
          </Show>
        </div>
        <Show when={activeAlertNames().length > 0}>
          <div class="text-destructive text-xs">
            <For each={activeAlertNames()}>
              {(name, i) => (
                <span>
                  {name}
                  {i() < activeAlertNames().length - 1 ? ", " : ""}
                </span>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
}
