import { useEntities } from "@glasshome/sync-layer/solid";
import { Icon } from "@iconify-icon/solid";
import {
  countActiveEntities,
  defineWidget,
  getEntityAttribute,
  isEntityActive,
  stateColors,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import type { WidgetDebugData } from "../common";
import { buildDebugData, EntitySelector, getBinarySensorIcon, WidgetDebugView, widgetDialogProps } from "../common";
import { getBinarySensorStateText } from "./utils";

interface BinarySensorConfig {
  title?: string;
  entityIds: string[];
}

function BinarySensorWidget(props: { config: BinarySensorConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();
  const [draftEntityIds, setDraftEntityIds] = createSignal<string[]>(props.config.entityIds);
  const hasChanges = () =>
    JSON.stringify(draftEntityIds()) !== JSON.stringify(props.config.entityIds);

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
      hold: { action: openDialog, delay: 300 },
    }),
    () => ctx.orientation(),
  );
  onCleanup(gestures.dispose);

  const colors = createMemo(() => (isOn() ? stateColors.active : stateColors.inactive));

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const ents = entities();
    if (ents.length === 0) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, ents);
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
        <Widget variant="classic-glass" gradient={colors().gradient} emptyState={emptyState()}>
          <Show when={hasEntities()}>
            <Widget.Content>
              <Widget.Icon
                icon={<Icon icon={iconName()} />}
                color={colors().icon}
                glow={isOn() ? colors().glow : undefined}
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
      </div>
      <WidgetDialog
        {...widgetDialogProps}
        open={showDialog()}
        onOpenChange={(open) => {
          if (!open) setDraftEntityIds(props.config.entityIds);
          setShowDialog(open);
        }}
        title="Binary Sensor"
        maxWidth="lg"
        hasUnsavedChanges={hasChanges()}
        onSave={() => {
          ctx.updateConfig({ ...props.config, entityIds: draftEntityIds() });
          setShowDialog(false);
        }}
        editContent={
          <EntitySelector
            entityIds={draftEntityIds()}
            onEntityIdsChange={setDraftEntityIds}
            domain="binary_sensor"
          />
        }
        debugContent={debugData() ? <WidgetDebugView data={debugData()!} /> : undefined}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<"status", BinarySensorConfig>({
  manifest: {
    tag: "glasshome-binary-sensor",
    type: "status",
    name: "Binary Sensor",
    description: "Motion, door, occupancy sensors",
    icon: "mdi:checkbox-marked-circle",
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
      },
    },
    defaultConfig: { entityIds: [] },
  },
  component: BinarySensorWidget,
});
