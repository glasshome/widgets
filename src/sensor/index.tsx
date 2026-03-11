import { trackEntityHistory, untrackEntityHistory } from "@glasshome/sync-layer";
import { useEntities, useEntityHistory } from "@glasshome/sync-layer/solid";
import { Icon } from "@iconify-icon/solid";
import {
  defineWidget,
  getEntityAttribute,
  stateColors,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  WidgetDialog,
  type SensorGroupResult,
  type SensorGroupType,
} from "@glasshome/widget-sdk";
import { createMemo, onCleanup, onMount, createSignal, Show } from "solid-js";
import type { WidgetDebugData } from "../common";
import { buildDebugData, EntitySelector, getSensorIcon, WidgetDebugView, widgetDialogProps } from "../common";
import { Sparkline } from "./sparkline";
import { formatSensorValue } from "./utils";

interface SensorConfig {
  title?: string;
  entityIds: string[];
  aggregationType?: SensorGroupType;
}

function SensorWidget(props: { config: SensorConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();
  const [draftEntityIds, setDraftEntityIds] = createSignal<string[]>(props.config.entityIds);
  const [draftAggType, setDraftAggType] = createSignal<SensorGroupType>(
    props.config.aggregationType ?? "mean",
  );
  const hasChanges = () =>
    JSON.stringify(draftEntityIds()) !== JSON.stringify(props.config.entityIds) ||
    draftAggType() !== (props.config.aggregationType ?? "mean");

  const entities = useEntities(() => props.config.entityIds);

  const primaryEntityId = () => props.config.entityIds[0];
  const historyData = useEntityHistory(() => primaryEntityId() ?? "");

  onMount(() => {
    const id = primaryEntityId();
    if (id) {
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      trackEntityHistory(id, { startTime });
    }
  });
  onCleanup(() => {
    const id = primaryEntityId();
    if (id) untrackEntityHistory(id);
  });

  const dataPoints = createMemo(() => {
    const history = historyData();
    if (!history?.timeline) return [];
    return history.timeline
      .map((entry) => Number(entry.state))
      .filter((v) => !Number.isNaN(v));
  });

  const { emptyState, hasEntities, count, aggregatedData } = useWidgetEntityGroup({
    entities,
    aggregationMode: () => "sensor",
    sensorGroupType: () => props.config.aggregationType ?? "mean",
    emptyStateConfig: {
      icon: <Icon icon="mdi:eye" width={32} />,
      title: "No sensor entity",
      message: "Hold to configure",
    },
  });

  const deviceClass = createMemo(() => {
    const first = entities()[0];
    if (!first) return null;
    return getEntityAttribute<string>(first, "device_class") ?? null;
  });

  const iconName = createMemo(() => getSensorIcon(deviceClass()));

  const sensorData = createMemo(() => aggregatedData() as SensorGroupResult | undefined);

  const displayValue = createMemo(() => {
    const data = sensorData();
    if (!data) return "--";
    if (data.numericValue !== null) {
      return formatSensorValue(data.numericValue, deviceClass());
    }
    return data.state;
  });

  const displayUnit = createMemo(() => sensorData()?.unit ?? "");

  const subtitle = createMemo(() => {
    const total = count();
    if (total <= 1) return undefined;
    const data = sensorData();
    return data?.description ?? `${total} sensors`;
  });

  const gestures = useWidgetGestures(
    () => ({
      hold: { action: openDialog, delay: 300 },
    }),
    () => ctx.orientation(),
  );
  onCleanup(gestures.dispose);

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const ents = entities();
    if (ents.length === 0) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, ents, {
      aggregation: sensorData(),
    });
  });

  return (
    <>
      <div
        class="h-full w-full"
        on:pointerdown={gestures.onPointerDown}
        on:pointermove={gestures.onPointerMove}
        on:pointerup={gestures.onPointerUp}
        on:pointercancel={gestures.onPointerCancel}
      >
        <Widget
          variant="classic-glass"
          gradient={stateColors.active.gradient}
          emptyState={emptyState()}
        >
          <Show when={hasEntities()}>
            <Widget.Content>
              <Widget.Icon
                icon={<Icon icon={iconName()} />}
                color={stateColors.active.icon}
                entityCount={entities().length}
              />
              <div class="flex flex-col gap-1 overflow-hidden">
                <Widget.Title>
                  {props.config.title || entities()[0]?.friendlyName || "Sensor"}
                </Widget.Title>
                <Widget.Value value={displayValue()} unit={displayUnit() || undefined} />
                <Show when={subtitle()}>
                  <Widget.Status>{subtitle()}</Widget.Status>
                </Show>
              </div>
            </Widget.Content>
            <Show when={dataPoints().length >= 2}>
              <div class="absolute bottom-0 left-0 right-0 h-8 opacity-40">
                <Sparkline data={dataPoints()} />
              </div>
            </Show>
          </Show>
        </Widget>
      </div>
      <WidgetDialog
        {...widgetDialogProps}
        open={showDialog()}
        onOpenChange={(open) => {
          if (!open) {
            setDraftEntityIds(props.config.entityIds);
            setDraftAggType(props.config.aggregationType ?? "mean");
          }
          setShowDialog(open);
        }}
        title="Sensor"
        maxWidth="lg"
        hasUnsavedChanges={hasChanges()}
        onSave={() => {
          ctx.updateConfig({
            ...props.config,
            entityIds: draftEntityIds(),
            aggregationType: draftAggType(),
          });
          setShowDialog(false);
        }}
        editContent={
          <div class="flex flex-col gap-4">
            <EntitySelector
              entityIds={draftEntityIds()}
              onEntityIdsChange={setDraftEntityIds}
              domain="sensor"
            />
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium">Aggregation Type</label>
              <select
                value={draftAggType()}
                onChange={(e) => setDraftAggType(e.currentTarget.value as SensorGroupType)}
                class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="mean">Mean (Average)</option>
                <option value="min">Minimum</option>
                <option value="max">Maximum</option>
                <option value="sum">Sum</option>
                <option value="median">Median</option>
              </select>
            </div>
          </div>
        }
        debugContent={debugData() ? <WidgetDebugView data={debugData()!} /> : undefined}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<"status", SensorConfig>({
  manifest: {
    tag: "glasshome-sensor",
    type: "status",
    name: "Sensor",
    description: "Display sensor values with aggregation",
    icon: "mdi:eye",
    size: "small",
    sdkVersion: "^0.2.0",
    schema: {
      type: "object",
      properties: {
        title: { type: "string", title: "Title" },
        entityIds: {
          type: "array",
          title: "Entities",
          items: { type: "string" },
          default: [],
        },
        aggregationType: {
          type: "string",
          title: "Aggregation",
          enum: ["mean", "min", "max", "sum", "median"],
          default: "mean",
        },
      },
    },
    defaultConfig: { entityIds: [], aggregationType: "mean" },
  },
  component: SensorWidget,
});
