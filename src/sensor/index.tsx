import {
  defineConfig,
  defineWidget,
  field,
  getEntityAttribute,
  type Infer,
  type SensorGroupResult,
  trackEntityHistory,
  untrackEntityHistory,
  useEntities,
  useEntityHistory,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, onCleanup, onMount, Show } from "solid-js";
import type { WidgetDebugData } from "../common";
import { buildDebugData, getSensorIcon, WidgetDebugView, widgetDialogProps } from "../common";
import { Sparkline, type SparklinePoint } from "./sparkline";
import "./sensor.css";
import { formatSensorValue } from "./utils";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("sensor"),
  aggregationType: field.choice(["mean", "min", "max", "sum", "median"], {
    title: "Aggregation",
    default: "mean",
  }),
});
type SensorConfig = Infer<typeof configSchema>;

function SensorWidget(props: { config: SensorConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

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

  const gestures = useWidgetGestures(() => ({
    hold: { action: openDialog },
  }));
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
      <Widget gestures={gestures} variant="classic-glass" tone="info" emptyState={emptyState()}>
        <Show when={hasEntities()}>
          <Widget.Content class={dataPoints().length >= 2 ? "sensor-spark-reserve" : undefined}>
            <Widget.Icon icon={<Icon icon={iconName()} />} entityCount={entities().length} />
            <div class="flex flex-col gap-1 overflow-hidden">
              <Widget.Title>
                {props.config.title ||
                  entities()
                    .map((e) => e.friendlyName)
                    .join(", ") ||
                  "Sensor"}
              </Widget.Title>
              <Widget.Value value={displayValue()} unit={displayUnit() || undefined} />
              <Show when={subtitle()}>
                <Widget.Status>{subtitle()}</Widget.Status>
              </Show>
            </div>
          </Widget.Content>
          <Show when={dataPoints().length >= 2}>
            <div class="sensor-spark-band absolute right-0 bottom-0 left-0 opacity-50">
              <Sparkline data={dataPoints()} />
            </div>
          </Show>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Sensor"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        debugContent={(() => {
          const data = debugData();
          return data ? <WidgetDebugView data={data} /> : undefined;
        })()}
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
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Climate Sensors",
        size: { w: 2, h: 2 },
        config: {
          entityIds: [
            "sensor.temperature_living",
            "sensor.humidity_living",
            "sensor.temperature_outdoor",
          ],
          title: "Climate Sensors",
          aggregationType: "mean",
        },
      },
    ],
  },
  configSchema,
  component: SensorWidget,
});
