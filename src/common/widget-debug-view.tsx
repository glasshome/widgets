import type { EntityView } from "@glasshome/sync-layer";
import { For } from "solid-js";

export interface WidgetDebugData {
  widgetConfig: Record<string, unknown>;
  entities: Record<string, unknown>[];
  [key: string]: unknown;
}

export function buildDebugData(
  config: Record<string, unknown>,
  entities: EntityView[],
  extra?: Record<string, unknown>,
): WidgetDebugData {
  return {
    widgetConfig: config,
    entities: entities.map((e) => ({
      entity_id: e.id,
      state: e.state,
      domain: e.domain,
      friendly_name: e.friendlyName,
      device_class: e.deviceClass ?? null,
      area_id: e.areaId,
      last_changed: e.lastChanged.toISOString(),
      last_updated: e.lastUpdated.toISOString(),
      attributes: e.attributes,
    })),
    ...extra,
  };
}

function DebugSection(props: { title: string; data: unknown }) {
  return (
    <div class="space-y-1.5">
      <h3 class="font-semibold text-muted-foreground text-xs">{props.title}</h3>
      <pre class="overflow-auto rounded-lg bg-muted/50 p-3 font-mono text-xs leading-relaxed">
        {JSON.stringify(props.data, null, 2)}
      </pre>
    </div>
  );
}

export function WidgetDebugView(props: { data: WidgetDebugData }) {
  return (
    <div class="space-y-4">
      <DebugSection title="Widget Config" data={props.data.widgetConfig} />
      <For each={props.data.entities}>
        {(entity, i) => (
          <DebugSection
            title={`Entity ${props.data.entities.length > 1 ? i() + 1 : ""} — ${(entity as any).entity_id}`}
            data={entity}
          />
        )}
      </For>
      <For each={Object.keys(props.data).filter((k) => k !== "widgetConfig" && k !== "entities")}>
        {(key) => <DebugSection title={key} data={props.data[key]} />}
      </For>
    </div>
  );
}
