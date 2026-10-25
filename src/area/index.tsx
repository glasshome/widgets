import {
  buildDebugData,
  defineConfig,
  defineWidget,
  field,
  type Infer,
  presetValue,
  useArea,
  useService,
  useWidgetContext,
  useWidgetDialog,
  Widget,
  type WidgetDebugData,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import { ROOM_PRESETS, roomIcon } from "../common/art/room";
import { type AreaAction, AreaContent, builtInRoom, useRoomScene } from "./area-content";
import { AreaSheet } from "./sheet";
import {
  calculateMetrics,
  excludeEntities,
  groupEntitiesByDomain,
  HIDEABLE_DOMAINS,
  NO_EXCLUSIONS,
} from "./utils";

const configSchema = defineConfig({
  title: field.title(),
  areaId: field.area(),
  image: field.image({
    title: "Photo",
    description: "A room picture, or a photo of your own.",
    presets: ROOM_PRESETS,
  }),
  exclude: field.group(
    {
      domains: field.choices(HIDEABLE_DOMAINS, {
        title: "Hide whole groups",
        description: "Ignore every entity of these kinds in this area.",
        labels: {
          light: "Lights",
          switch: "Switches",
          cover: "Covers and doors",
          climate: "Climate",
          sensor: "Sensors",
          binary_sensor: "Binary sensors",
        },
      }),
      lights: field.entities("light", { title: "Ignore lights" }),
      switches: field.entities("switch", { title: "Ignore switches" }),
      covers: field.entities("cover", { title: "Ignore covers and doors" }),
      climate: field.entities("climate", { title: "Ignore climate" }),
      sensors: field.entities("sensor", { title: "Ignore sensors" }),
      binarySensors: field.entities("binary_sensor", { title: "Ignore binary sensors" }),
    },
    { title: "Exclude" },
  ),
});
type AreaConfig = Infer<typeof configSchema>;

function AreaWidget(props: { config: AreaConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();
  const { turnOn, turnOff, callService } = useService();

  const area = useArea(() => props.config.areaId ?? "");

  const visibleArea = createMemo(() => {
    const a = area();
    if (!a) return undefined;
    return {
      ...a,
      entities: excludeEntities(a.entities, props.config.exclude),
    };
  });

  const groups = createMemo(() => groupEntitiesByDomain(visibleArea()?.entities ?? []));

  const metrics = createMemo(() => calculateMetrics(groups(), visibleArea()));
  const { shown: roomPicture } = useRoomScene(() => ({
    image: props.config.image,
    picture: area()?.picture,
    lightsOn: metrics().lightsOn,
  }));

  const areaName = createMemo(() => props.config.title || area()?.name || "Area");
  const isActive = createMemo(() => metrics().lightsOn > 0);

  // Light toggle handler — lifted here so useService() is called once
  const toggleLights = () => {
    const lights = groups().lights.filter(
      (l) => l.state !== "unavailable" && l.state !== "unknown",
    );
    if (lights.length === 0) return;
    const action = isActive() ? turnOff : turnOn;
    void Promise.allSettled(lights.map((l) => action(l.id)));
  };

  const toggleGroup = (entities: { id: string; state: string }[], on: boolean) => {
    const live = entities.filter((e) => e.state !== "unavailable" && e.state !== "unknown");
    void Promise.allSettled(live.map((e) => (on ? turnOff(e.id) : turnOn(e.id))));
  };

  const toggleCovers = (covers: { id: string; state: string }[], open: boolean) => {
    const ids = covers
      .filter((c) => c.state !== "unavailable" && c.state !== "unknown")
      .map((c) => c.id);
    if (ids.length === 0) return;
    void callService("cover", open ? "close_cover" : "open_cover", {}, { entity_id: ids });
  };

  const onAction = (action: AreaAction) => {
    const g = groups();
    const m = metrics();
    if (action === "lights") toggleLights();
    else if (action === "covers") toggleCovers(g.covers, m.coversOpen > 0);
    else if (action === "switches")
      toggleGroup(
        g.switches,
        g.switches.some((s) => s.state === "on"),
      );
    else openDialog();
  };

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const a = visibleArea();
    if (!a) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, a.entities, {
      metrics: metrics(),
      groups: {
        lights: groups().lights.length,
        switches: groups().switches.length,
        covers: groups().covers.length,
        doors: groups().doors.length,
        climate: groups().climate.length,
        sensors: groups().sensors.length,
        binarySensors: groups().binarySensors.length,
      },
    });
  });

  return (
    <>
      <Widget
        variant="classic-glass"
        tone="neutral"
        emptyState={
          !props.config.areaId
            ? {
                icon: <Icon icon="mdi:home-floor-1" width={32} />,
                title: "No area selected",
                message: "Hold to select area",
              }
            : area() === undefined
              ? {
                  icon: <Icon icon="mdi:home-alert" width={32} />,
                  title: "Area not found",
                  message: "Hold to change area",
                }
              : undefined
        }
      >
        <Show when={area()}>
          <AreaContent
            metrics={metrics()}
            groups={groups()}
            areaName={areaName()}
            areaIcon={area()?.icon}
            picture={area()?.picture}
            image={props.config.image}
            onAction={onAction}
            onMore={openDialog}
          />
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title={areaName()}
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        tile={{
          icon: area()?.icon ?? roomIcon(builtInRoom(props.config.image)),
          tone: metrics().lightsOn > 0 ? "var(--tone-warning)" : undefined,
          backdrop: roomPicture(),
        }}
        sheet={() => (
          <Show when={visibleArea()}>{(a) => <AreaSheet area={a()} metrics={metrics()} />}</Show>
        )}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<AreaConfig>({
  manifest: {
    name: "Area",
    configVersion: 2,
    description: "Area overview with entity grouping and batch controls",
    icon: "mdi:home-floor-1",
    minSize: { w: 2, h: 2 },
    maxSize: { w: 8, h: 8 },
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Living Room",
        size: { w: 3, h: 3 },
        config: {
          areaId: "living_room",
          title: "Living Room",
          image: presetValue("living"),
          exclude: NO_EXCLUSIONS,
        },
      },
      {
        label: "Bedroom",
        size: { w: 3, h: 3 },
        config: { areaId: "bedroom", image: presetValue("bedroom"), exclude: NO_EXCLUSIONS },
      },
      {
        label: "Kitchen",
        size: { w: 3, h: 3 },
        config: { areaId: "kitchen", image: presetValue("kitchen"), exclude: NO_EXCLUSIONS },
      },
      {
        label: "Entry",
        size: { w: 3, h: 3 },
        config: { areaId: "entry", image: presetValue("hallway"), exclude: NO_EXCLUSIONS },
      },
      {
        label: "Garage",
        size: { w: 3, h: 3 },
        config: { areaId: "garage", image: presetValue("garage"), exclude: NO_EXCLUSIONS },
      },
      {
        label: "Small",
        size: { w: 2, h: 2 },
        config: {
          areaId: "living_room",
          title: "Living Room",
          image: presetValue("living"),
          exclude: NO_EXCLUSIONS,
        },
      },
      {
        label: "Wide",
        size: { w: 4, h: 2 },
        config: { areaId: "bedroom", image: presetValue("bedroom"), exclude: NO_EXCLUSIONS },
      },
      {
        label: "Large",
        size: { w: 6, h: 4 },
        config: { areaId: "kitchen", image: presetValue("kitchen"), exclude: NO_EXCLUSIONS },
      },
      {
        label: "Plain glass",
        size: { w: 3, h: 2 },
        config: { areaId: "entry", exclude: NO_EXCLUSIONS },
      },
    ],
  },
  configSchema,
  component: AreaWidget,
});
