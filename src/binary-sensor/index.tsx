import {
  countActiveEntities,
  defineConfig,
  defineWidget,
  field,
  getEntityAttribute,
  type Infer,
  isEntityActive,
  useEntities,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  WidgetDialog,
  buildDebugData,
  type WidgetDebugData,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, onCleanup, Show } from "solid-js";
import { getBinarySensorIcon, widgetDialogProps } from "../common";
import { Tile, TileGlyph, TileHead, TileHero } from "../common/tile/tile";
import { getBinarySensorStateText } from "./utils";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("binary_sensor"),
});

type BinarySensorConfig = Infer<typeof configSchema>;

function BinarySensorWidget(props: { config: BinarySensorConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

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
    return first.deviceClass ?? getEntityAttribute<string>(first, "device_class") ?? null;
  });

  const iconName = createMemo(() => getBinarySensorIcon(deviceClass(), isOn()));

  const activeCount = createMemo(() => countActiveEntities(entities()));

  const name = () =>
    props.config.title ||
    entities()
      .map((e) => e.friendlyName)
      .join(", ") ||
    "Sensor";
  const heroValue = () => {
    const active = activeCount();
    if (count() > 1 && active > 0 && active < count()) return `${active}/${count()}`;
    return getBinarySensorStateText(deviceClass(), active > 0);
  };
  const eyebrow = () => {
    const cls = deviceClass();
    if (count() > 1) return `${count()} sensors`;
    return cls ? `${cls.charAt(0).toUpperCase()}${cls.slice(1).replace(/_/g, " ")}` : "Sensor";
  };

  const gestures = useWidgetGestures(() => ({
    hold: { action: openDialog },
  }));
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
          <Tile active={isOn()}>
            <TileGlyph icon={iconName()} />
            <TileHead
              icon={iconName()}
              eyebrow={eyebrow()}
              name={name()}
              active={isOn()}
              count={entities().length}
            />
            <TileHero value={heroValue()} />
          </Tile>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Binary Sensor"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
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
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Contact & Motion",
        size: { w: 2, h: 2 },
        config: {
          entityIds: [
            "binary_sensor.front_door",
            "binary_sensor.motion_hallway",
            "binary_sensor.window_bedroom",
          ],
          title: "Front Door",
        },
      },
    ],
  },
  configSchema,
  component: BinarySensorWidget,
});
