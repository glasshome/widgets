import {
  buildDebugData,
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
  type WidgetDebugData,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, type JSX, onCleanup, Show } from "solid-js";
import { getBinarySensorIcon, widgetDialogProps } from "../common";
import doorSwing from "../common/art/assets/door-swing.strip";
import windowSash from "../common/art/assets/window-sash.strip";
import { CoverArt } from "../common/art/cover";
import { ArtStrip } from "../common/art/strip";
import { Tile, TileGlyph, TileHead, TileHero } from "../common/tile/tile";
import { BinarySensorSheet } from "./sheet";
import { getBinarySensorStateText } from "./utils";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("binary_sensor"),
  art: field.choice(["device", "door", "window", "garage", "none"], {
    title: "Sensor picture",
    default: "device",
    labels: {
      device: "Match Home Assistant",
      door: "Door",
      window: "Window",
      garage: "Garage door",
      none: "No picture",
    },
    icons: {
      device: "mdi:home-assistant",
      door: "mdi:door",
      window: "mdi:window-open-variant",
      garage: "mdi:garage-variant",
      none: "mdi:image-off-outline",
    },
  }),
});

type ArtKind = "door" | "window" | "garage";

const ART_BY_DEVICE_CLASS: Partial<Record<string, ArtKind>> = {
  door: "door",
  window: "window",
  garage_door: "garage",
};

const ART: Record<ArtKind, (open: () => boolean) => JSX.Element> = {
  door: (open) => <ArtStrip strip={doorSwing} end={open()} />,
  window: (open) => <ArtStrip strip={windowSash} end={open()} />,
  garage: (open) => <CoverArt kind="garage" closed={open() ? 0 : 100} />,
};

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

  const artKind = (): ArtKind | undefined => {
    const art = props.config.art;
    if (art === "none") return undefined;
    if (art !== "device") return art;
    return ART_BY_DEVICE_CLASS[deviceClass() ?? ""];
  };

  const art = () => {
    const kind = artKind();
    return kind ? ART[kind](isOn) : undefined;
  };

  const gestures = useWidgetGestures(() => ({
    hold: count() > 1 ? { action: openDialog } : undefined,
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
            <TileHero value={heroValue()} art={art()} />
          </Tile>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title={name()}
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        {...(count() > 1 ? { sheet: <BinarySensorSheet entities={entities()} /> } : {})}
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
    maxSize: { w: 8, h: 8 },
    defaultSize: { w: 2, h: 2 },
    configVersion: 1,
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Door open",
        size: { w: 2, h: 2 },
        config: { entityIds: ["binary_sensor.patio_door"], title: "Patio Door", art: "door" },
      },
      {
        label: "Door",
        size: { w: 1, h: 1 },
        config: { entityIds: ["binary_sensor.front_door"], title: "Front Door", art: "device" },
      },
      {
        label: "Window closed",
        size: { w: 3, h: 2 },
        config: { entityIds: ["binary_sensor.window_bedroom"], title: "Bedroom", art: "window" },
      },
      {
        label: "Garage closed",
        size: { w: 3, h: 3 },
        config: { entityIds: ["binary_sensor.front_door"], title: "Garage", art: "garage" },
      },
      {
        label: "Motion",
        size: { w: 2, h: 2 },
        config: { entityIds: ["binary_sensor.motion_kitchen"], title: "Kitchen", art: "device" },
      },
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
          art: "device",
        },
      },
    ],
  },
  configSchema,
  component: BinarySensorWidget,
});
