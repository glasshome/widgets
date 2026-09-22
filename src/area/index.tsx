import {
  buildDebugData,
  defineConfig,
  defineWidget,
  field,
  type Infer,
  useArea,
  useService,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  type WidgetDebugData,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, onCleanup, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import { type AreaAction, AreaContent } from "./area-content";
import { AreaControls } from "./area-controls";
import { calculateMetrics, groupEntitiesByDomain } from "./utils";

const configSchema = defineConfig({
  title: field.title(),
  areaId: field.area(),
});
type AreaConfig = Infer<typeof configSchema>;

function AreaWidget(props: { config: AreaConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();
  const { turnOn, turnOff } = useService();

  const area = useArea(() => props.config.areaId ?? "");

  const groups = createMemo(() => {
    const a = area();
    if (!a)
      return {
        lights: [],
        switches: [],
        covers: [],
        doors: [],
        climate: [],
        sensors: [],
        binarySensors: [],
      };
    return groupEntitiesByDomain(a.entities);
  });

  const metrics = createMemo(() => calculateMetrics(groups(), area()));

  const areaName = createMemo(() => props.config.title || area()?.name || "Area");
  const isActive = createMemo(() => metrics().lightsOn > 0);

  // Light toggle handler — lifted here so useService() is called once
  const toggleLights = () => {
    const lights = groups().lights.filter(
      (l) => l.state !== "unavailable" && l.state !== "unknown",
    );
    if (lights.length === 0) return;
    const action = isActive() ? turnOff : turnOn;
    Promise.allSettled(lights.map((l) => action(l.id)));
  };

  const toggleGroup = (entities: { id: string; state: string }[], on: boolean) => {
    const live = entities.filter((e) => e.state !== "unavailable" && e.state !== "unknown");
    Promise.allSettled(live.map((e) => (on ? turnOff(e.id) : turnOn(e.id))));
  };

  const onAction = (action: AreaAction) => {
    const g = groups();
    const m = metrics();
    if (action === "lights") toggleLights();
    else if (action === "covers") toggleGroup(g.covers, m.coversOpen > 0);
    else if (action === "switches")
      toggleGroup(
        g.switches,
        g.switches.some((s) => s.state === "on"),
      );
    else openDialog();
  };

  const gestures = useWidgetGestures(() => ({ hold: { action: openDialog } }));
  onCleanup(gestures.dispose);

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const a = area();
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
        gestures={gestures}
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
            onAction={onAction}
            onMore={openDialog}
          />
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Area"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        controlsContent={<AreaControls groups={groups()} />}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<AreaConfig>({
  manifest: {
    name: "Area",
    description: "Area overview with entity grouping and batch controls",
    icon: "mdi:home-floor-1",
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 6 },
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Living Room",
        size: { w: 3, h: 3 },
        config: { areaId: "living_room", title: "Living Room" },
      },
      { label: "Bedroom", size: { w: 3, h: 3 }, config: { areaId: "bedroom" } },
      { label: "Kitchen", size: { w: 3, h: 3 }, config: { areaId: "kitchen" } },
      { label: "Entry", size: { w: 3, h: 3 }, config: { areaId: "entry" } },
      { label: "Garage", size: { w: 3, h: 3 }, config: { areaId: "garage" } },
    ],
  },
  configSchema,
  component: AreaWidget,
});
