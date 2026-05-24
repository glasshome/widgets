import { useEntities, useService, useToggle } from "@glasshome/sync-layer/solid";
import {
  defineWidget,
  isEntityActive,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  WidgetDialog,
  WidgetSliderFill,
  widgetFields,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js";
import { z } from "zod";
import type { WidgetDebugData } from "../common";
import { buildDebugData, WidgetDebugView, widgetDialogProps } from "../common";
import { LightControls } from "./controls";
import { brightnessToPercent, formatBrightness, hsToCSS } from "./utils";

const configSchema = z.object({
  title: widgetFields.title(),
  entityIds: widgetFields.entityIds("light"),
});
type LightConfig = z.infer<typeof configSchema>;

function LightWidget(props: { config: LightConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();

  const entities = useEntities(() => props.config.entityIds);
  const toggle = useToggle();
  const { callService } = useService();

  const { emptyState, hasEntities, count, aggregatedData } = useWidgetEntityGroup({
    entities,
    aggregationMode: () => "light",
    emptyStateConfig: {
      icon: <Icon icon="mdi:lightbulb" width={32} />,
      title: "No light entity",
      message: "Hold to configure",
    },
  });

  const isOn = createMemo(() => {
    const ents = entities();
    return ents.length > 0 && ents.some((e) => isEntityActive(e));
  });

  const lightData = createMemo(() => aggregatedData() as any);

  const serverBrightness = createMemo(() => {
    const data = lightData();
    if (data?.brightnessPercent != null) return data.brightnessPercent as number;
    const first = entities()[0];
    if (!first || first.state !== "on") return 0;
    const bri = first.attributes?.brightness as number | undefined;
    return bri ? brightnessToPercent(bri) : 100;
  });

  const [uiBrightness, setUiBrightness] = createSignal(serverBrightness());
  const [isDragging, setIsDragging] = createSignal(false);

  // Sync server brightness to UI when not dragging
  createEffect(() => {
    const sb = serverBrightness();
    if (!isDragging()) setUiBrightness(sb);
  });

  let slideDebounce: ReturnType<typeof setTimeout> | undefined;

  const handleBrightnessSlide = (value: number) => {
    setIsDragging(true);
    setUiBrightness(value);
    if (slideDebounce) clearTimeout(slideDebounce);
    slideDebounce = setTimeout(() => {
      setIsDragging(false);
      const ids = entities().map((e) => e.id);
      for (const id of ids) {
        callService("light" as any, "turn_on" as any, { brightness_pct: value }, { entity_id: id });
      }
    }, 300);
  };

  const handleTap = async () => {
    const ids = entities().map((e) => e.id);
    if (ids.length === 0) return;
    await toggle(ids);
  };

  const gestures = useWidgetGestures(
    () => ({
      tap: handleTap,
      slide: {
        value: uiBrightness(),
        onChange: handleBrightnessSlide,
        min: 0,
        max: 100,
        orientation: "auto" as const,
        activationDelay: 0,
      },
      hold: { action: openDialog },
    }),
    () => ctx.orientation(),
  );
  onCleanup(gestures.dispose);

  // Display color derived from current HS or color temp (only meaningful when on)
  const displayColor = createMemo(() => {
    const data = lightData();
    if (data?.color) return data.color as string;
    const first = entities()[0];
    if (!first) return "rgb(255, 200, 100)";
    const hs = first.attributes?.hs_color as [number, number] | undefined;
    if (hs) return hsToCSS(hs);
    return "rgb(255, 200, 100)";
  });

  const activeCount = createMemo(() => entities().filter((e) => isEntityActive(e)).length);

  const statusText = createMemo(() => {
    const total = count();
    if (total === 0) return "Off";
    if (!isOn()) return "Off";
    const bri = formatBrightness(uiBrightness());
    if (total === 1) return bri;
    const active = activeCount();
    return `${active}/${total} on - ${bri}`;
  });

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const ents = entities();
    if (ents.length === 0) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, ents, {
      lightGroup: lightData(),
      uiBrightness: uiBrightness(),
    });
  });

  return (
    <>
      <Widget
        gestures={gestures}
        variant="classic-glass"
        tone="neutral"
        emptyState={emptyState()}
        class={isDragging() ? "duration-0" : undefined}
      >
        <Show when={hasEntities()}>
          <WidgetSliderFill
            value={uiBrightness()}
            color={displayColor()}
            isDragging={isDragging()}
          />
          <Widget.Content>
            <Widget.Icon
              icon={<Icon icon={isOn() ? "mdi:lightbulb" : "mdi:lightbulb-outline"} />}
              color={isOn() ? displayColor() : undefined}
              entityCount={entities().length}
            />
            <div class="flex flex-col gap-1 overflow-hidden">
              <Widget.Title>
                {props.config.title ||
                  entities()
                    .map((e) => e.friendlyName)
                    .join(", ") ||
                  "Light"}
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
        title="Light"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        controlsContent={<LightControls entities={entities} brightness={() => uiBrightness()} />}
        debugContent={debugData() ? <WidgetDebugView data={debugData()!} /> : undefined}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<LightConfig>({
  manifest: {
    name: "Light",
    description: "Light control with brightness, color, and temperature",
    icon: "mdi:lightbulb",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^0.3.0",
  },
  configSchema,
  component: LightWidget,
});
