import { trackEntityHistory, untrackEntityHistory } from "@glasshome/sync-layer";
import { useEntities, useEntityHistory } from "@glasshome/sync-layer/solid";
import {
  defineWidget,
  getEntityAttribute,
  type SensorGroupResult,
  stateColors,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  WidgetDialog,
  widgetFields,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, onCleanup, onMount, Show } from "solid-js";
import { z } from "zod";
import type { WidgetDebugData } from "../common";
import { buildDebugData, getSensorIcon, WidgetDebugView, widgetDialogProps } from "../common";
import { Sparkline, type SparklinePoint } from "./sparkline";
import { formatSensorValue } from "./utils";

const configSchema = z.object({
  title: widgetFields.title(),
  entityIds: widgetFields.entityIds("sensor"),
  aggregationType: z
    .enum(["mean", "min", "max", "sum", "median"])
    .default("mean")
    .meta({ title: "Aggregation" }),
});
type SensorConfig = z.infer<typeof configSchema>;

function SensorWidget(props: { config: SensorConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();

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

  const dataPoints = createMemo<SparklinePoint[]>(() => {
    const history = historyData();
    if (!history?.timeline) return [];
    return history.timeline
      .map((entry) => ({ value: Number(entry.state), timestamp: entry.timestamp }))
      .filter((d) => !Number.isNaN(d.value));
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
      hold: { action: openDialog },
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
      <Widget
        gestures={gestures}
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
            <div class="absolute right-0 bottom-0 left-0 h-16 opacity-50">
              <Sparkline data={dataPoints()} />
            </div>
          </Show>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        open={showDialog()}
        onOpenChange={setShowDialog}
        title="Sensor"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        debugContent={debugData() ? <WidgetDebugView data={debugData()!} /> : undefined}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<SensorConfig>({
  manifest: {
    name: "Sensor",
    description: "Display sensor values with aggregation",
    icon: "mdi:eye",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^0.3.0",
  },
  configSchema,
  component: SensorWidget,
});
