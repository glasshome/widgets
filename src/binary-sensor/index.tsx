import { useEntities } from "@glasshome/sync-layer/solid";
import {
  countActiveEntities,
  defineWidget,
  getEntityAttribute,
  isEntityActive,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  WidgetDialog,
  widgetFields,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, onCleanup, Show } from "solid-js";
import { z } from "zod";
import type { WidgetDebugData } from "../common";
import { buildDebugData, getBinarySensorIcon, WidgetDebugView, widgetDialogProps } from "../common";
import { getBinarySensorStateText } from "./utils";

const configSchema = z.object({
  title: widgetFields.title(),
  entityIds: widgetFields.entityIds("binary_sensor"),
});

type BinarySensorConfig = z.infer<typeof configSchema>;

function BinarySensorWidget(props: { config: BinarySensorConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();

  const entities = useEntities(() => props.config.entityIds);

  const { emptyState, hasEntities, count } = useWidgetEntityGroup({
    entities,
    aggregationMode: () => "binary-sensor",
    emptyStateConfig: {
      icon: <Icon icon="mdi:checkbox-marked-circle" width={32} />,
      title: "No sensor",
      message: "Hold to configure",
    },
  });

  const isOn = createMemo(() => {
    const ents = entities();
    return ents.length > 0 && ents.some((e) => isEntityActive(e));
  });

  const deviceClass = createMemo(() => {
    const first = entities()[0];
    if (!first) return null;
    return getEntityAttribute<string>(first, "device_class") ?? null;
  });

  const iconName = createMemo(() => getBinarySensorIcon(deviceClass(), isOn()));

  const activeCount = createMemo(() => countActiveEntities(entities()));

  const statusText = createMemo(() => {
    const total = count();
    if (total === 0) return "Unknown";
    if (total === 1) return getBinarySensorStateText(deviceClass(), isOn());
    const active = activeCount();
    if (active === 0) return `All ${getBinarySensorStateText(deviceClass(), false).toLowerCase()}`;
    if (active === total)
      return `All ${getBinarySensorStateText(deviceClass(), true).toLowerCase()}`;
    return `${active} of ${total} active`;
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
    return buildDebugData(props.config as unknown as Record<string, unknown>, ents);
  });

  return (
    <>
      <Widget
        gestures={gestures}
        variant="classic-glass"
        tone={isOn() ? "info" : "neutral"}
        emptyState={emptyState()}
      >
        <Show when={hasEntities()}>
          <Widget.Content>
            <Widget.Icon
              icon={<Icon icon={iconName()} />}
              entityCount={entities().length}
            />
            <div class="flex flex-col gap-1 overflow-hidden">
              <Widget.Title>
                {props.config.title || entities()[0]?.friendlyName || "Binary Sensor"}
              </Widget.Title>
              <Widget.Status>{statusText()}</Widget.Status>
            </div>
          </Widget.Content>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        open={showDialog()}
        onOpenChange={setShowDialog}
        title="Binary Sensor"
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

export default defineWidget<BinarySensorConfig>({
  manifest: {
    name: "Binary Sensor",
    description: "Motion, door, occupancy sensors",
    icon: "mdi:checkbox-marked-circle",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^0.3.0",
  },
  configSchema,
  component: BinarySensorWidget,
});
