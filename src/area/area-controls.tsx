import { useService } from "@glasshome/sync-layer/solid";
import { Icon } from "@iconify-icon/solid";
import { For, Show } from "solid-js";
import type { EntityGroups } from "./utils";

interface AreaControlsProps {
  groups: EntityGroups;
}

function EntityToggleRow(props: {
  entityId: string;
  name: string;
  state: string;
  icon: string;
  onToggle: () => void;
}) {
  const isOn = () => props.state === "on";

  return (
    <button
      type="button"
      class="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted"
      onClick={props.onToggle}
    >
      <Icon
        icon={props.icon}
        width={18}
        class={isOn() ? "text-primary" : "text-muted-foreground"}
      />
      <span class="flex-1 truncate text-sm">{props.name}</span>
      <span class={`text-xs ${isOn() ? "text-primary" : "text-muted-foreground"}`}>
        {props.state}
      </span>
    </button>
  );
}

function BatchToggleButton(props: { label: string; onAction: () => void }) {
  return (
    <button
      type="button"
      class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
      onClick={props.onAction}
    >
      {props.label}
    </button>
  );
}

export function AreaControls(props: AreaControlsProps) {
  const { callService, turnOn, turnOff } = useService();

  const batchToggle = (entities: { id: string; state: string }[], domain: string) => {
    const onCount = entities.filter((e) => e.state === "on").length;
    const shouldTurnOff = onCount > entities.length / 2;
    const service = shouldTurnOff ? "turn_off" : "turn_on";
    for (const entity of entities) {
      callService(domain as any, service as any, {}, { entity_id: entity.id });
    }
  };

  const toggleEntity = (entityId: string, domain: string) => {
    callService(domain as any, "toggle" as any, {}, { entity_id: entityId });
  };

  return (
    <div class="flex flex-col gap-4">
      {/* Lights */}
      <Show when={props.groups.lights.length > 0}>
        <div class="flex flex-col gap-2">
          <h3 class="font-semibold text-muted-foreground text-xs uppercase">Lights</h3>
          <BatchToggleButton
            label="Toggle all lights"
            onAction={() => batchToggle(props.groups.lights, "light")}
          />
          <div class="flex flex-col gap-0.5">
            <For each={props.groups.lights}>
              {(entity) => (
                <EntityToggleRow
                  entityId={entity.id}
                  name={entity.friendlyName}
                  state={entity.state}
                  icon={entity.state === "on" ? "mdi:lightbulb" : "mdi:lightbulb-outline"}
                  onToggle={() => toggleEntity(entity.id, "light")}
                />
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Switches */}
      <Show when={props.groups.switches.length > 0}>
        <div class="flex flex-col gap-2">
          <h3 class="font-semibold text-muted-foreground text-xs uppercase">Switches</h3>
          <BatchToggleButton
            label="Toggle all switches"
            onAction={() => batchToggle(props.groups.switches, "switch")}
          />
          <div class="flex flex-col gap-0.5">
            <For each={props.groups.switches}>
              {(entity) => (
                <EntityToggleRow
                  entityId={entity.id}
                  name={entity.friendlyName}
                  state={entity.state}
                  icon={entity.state === "on" ? "mdi:toggle-switch" : "mdi:toggle-switch-off"}
                  onToggle={() => toggleEntity(entity.id, "switch")}
                />
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Covers */}
      <Show when={props.groups.covers.length > 0}>
        <div class="flex flex-col gap-2">
          <h3 class="font-semibold text-muted-foreground text-xs uppercase">Covers</h3>
          <div class="flex gap-2">
            <button
              type="button"
              class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
              onClick={() => {
                for (const entity of props.groups.covers) {
                  callService("cover" as any, "open_cover" as any, {}, { entity_id: entity.id });
                }
              }}
            >
              <Icon icon="mdi:arrow-up" width={16} />
              Open all
            </button>
            <button
              type="button"
              class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
              onClick={() => {
                for (const entity of props.groups.covers) {
                  callService("cover" as any, "close_cover" as any, {}, { entity_id: entity.id });
                }
              }}
            >
              <Icon icon="mdi:arrow-down" width={16} />
              Close all
            </button>
          </div>
          <div class="flex flex-col gap-0.5">
            <For each={props.groups.covers}>
              {(entity) => (
                <div class="flex items-center gap-3 rounded-lg px-3 py-2">
                  <Icon icon="mdi:blinds" width={18} class="text-muted-foreground" />
                  <span class="flex-1 truncate text-sm">{entity.friendlyName}</span>
                  <span class="text-muted-foreground text-xs">{entity.state}</span>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Climate */}
      <Show when={props.groups.climate.length > 0}>
        <div class="flex flex-col gap-2">
          <h3 class="font-semibold text-muted-foreground text-xs uppercase">Climate</h3>
          <div class="flex flex-col gap-0.5">
            <For each={props.groups.climate}>
              {(entity) => (
                <div class="flex items-center gap-3 rounded-lg px-3 py-2">
                  <Icon icon="mdi:thermostat" width={18} class="text-muted-foreground" />
                  <span class="flex-1 truncate text-sm">{entity.friendlyName}</span>
                  <div class="flex items-center gap-2 text-muted-foreground text-xs">
                    <Show when={entity.attributes?.current_temperature != null}>
                      <span>{entity.attributes.current_temperature}°</span>
                    </Show>
                    <span class="capitalize">{entity.state}</span>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
