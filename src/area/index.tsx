import { useArea, useService } from "@glasshome/sync-layer/solid";
import {
  defineWidget,
  stateColors,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  WidgetDialog,
  widgetFields,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, onCleanup, Show } from "solid-js";
import { z } from "zod";
import type { WidgetDebugData } from "../common";
import { buildDebugData, WidgetDebugView, widgetDialogProps } from "../common";
import { AreaContent } from "./area-content";
import { AreaControls } from "./area-controls";
import { calculateMetrics, groupEntitiesByDomain } from "./utils";

const configSchema = z.object({
  title: widgetFields.title(),
  areaId: widgetFields.areaId(),
});
type AreaConfig = z.infer<typeof configSchema>;

function AreaWidget(props: { config: AreaConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();
  const { turnOn, turnOff } = useService();

  const area = useArea(() => props.config.areaId ?? "");

  const groups = createMemo(() => {
    const a = area();
    if (!a)
      return { lights: [], switches: [], covers: [], climate: [], sensors: [], binarySensors: [] };
    return groupEntitiesByDomain(a.entities);
  });

  const metrics = createMemo(() => calculateMetrics(groups(), area()));

  const areaIcon = createMemo(() => area()?.icon || "mdi:home-floor-1");
  const areaName = createMemo(() => props.config.title || area()?.name || "Area");
  const isActive = createMemo(() => metrics().lightsOn > 0);
  const colors = createMemo(() => (isActive() ? stateColors.active : stateColors.inactive));

  // Light toggle handler — lifted here so useService() is called once
  const toggleLights = () => {
    const lights = groups().lights.filter(
      (l) => l.state !== "unavailable" && l.state !== "unknown",
    );
    if (lights.length === 0) return;
    const action = isActive() ? turnOff : turnOn;
    Promise.allSettled(lights.map((l) => action(l.id)));
  };

  const gestures = useWidgetGestures(
    () => ({ hold: { action: openDialog, delay: 300 } }),
    () => ctx.orientation(),
  );
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
        climate: groups().climate.length,
        sensors: groups().sensors.length,
        binarySensors: groups().binarySensors.length,
      },
    });
  });

  return (
    <>
      <div
        class="h-full w-full"
        on:pointerenter={gestures.onPointerEnter}
        on:pointerdown={gestures.onPointerDown}
        on:pointermove={gestures.onPointerMove}
        on:pointerup={gestures.onPointerUp}
        on:pointercancel={gestures.onPointerCancel}
      >
        <Widget
          variant="classic-glass"
          gradient={colors().gradient}
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
            <Widget.Content>
              <AreaContent
                metrics={metrics()}
                groups={groups()}
                areaName={areaName()}
                areaIcon={areaIcon()}
                onToggleLights={toggleLights}
              />
            </Widget.Content>
          </Show>
        </Widget>
      </div>
      <WidgetDialog
        {...widgetDialogProps}
        open={showDialog()}
        onOpenChange={setShowDialog}
        title="Area"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        controlsContent={<AreaControls groups={groups()} />}
        debugContent={debugData() ? <WidgetDebugView data={debugData()!} /> : undefined}
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
    sdkVersion: "^0.3.0",
  },
  configSchema,
  component: AreaWidget,
});
