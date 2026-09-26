import {
  buildDebugData,
  defineConfig,
  defineWidget,
  field,
  type Infer,
  isEntityActive,
  useEntities,
  useService,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  type WidgetDebugData,
  WidgetDialog,
  WidgetSliderFill,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import { LAMP_ICONS, LAMP_KINDS, LAMP_LABELS, LampArt } from "../common/art/lamp";
import { groupLine } from "../common/group";
import { Tile, TileGlyph, TileHead, TileHero } from "../common/tile/tile";
import { LightSheet, lightHasExtras } from "./sheet";
import { brightnessToPercent, hsToCSS } from "./utils";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("light"),
  lamp: field.choice(LAMP_KINDS, {
    title: "Lamp picture",
    default: "table",
    labels: LAMP_LABELS,
    icons: LAMP_ICONS,
  }),
});
type LightConfig = Infer<typeof configSchema>;

function LightWidget(props: { config: LightConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

  const entities = useEntities(() => props.config.entityIds);
  const { callService, turnOn, turnOff } = useService();

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

  const lightData = createMemo(() => {
    const data = aggregatedData();
    return data && "brightnessPercent" in data ? data : undefined;
  });

  const serverBrightness = createMemo(() => {
    const data = lightData();
    if (data) return data.brightnessPercent;
    const first = entities()[0];
    if (first?.state !== "on") return 0;
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
        callService("light", "turn_on", { brightness_pct: value }, { entity_id: id });
      }
    }, 300);
  };

  const handleTap = async () => {
    const ids = entities().map((e) => e.id);
    if (ids.length === 0) return;
    await (isOn() ? turnOff(ids) : turnOn(ids));
  };

  const extras = createMemo(() => lightHasExtras(entities()));

  const gestures = useWidgetGestures(() => ({
    tap: handleTap,
    slide: {
      value: uiBrightness(),
      onChange: handleBrightnessSlide,
      min: 0,
      max: 100,
      orientation: "auto" as const,
      activationDelay: 0,
    },
    hold: extras() ? { action: openDialog } : undefined,
  }));
  onCleanup(gestures.dispose);

  // Display color derived from current HS or color temp (only meaningful when on)
  const displayColor = createMemo(() => {
    const data = lightData();
    if (data?.color) return data.color;
    const first = entities()[0];
    if (!first) return "rgb(255, 200, 100)";
    const hs = first.attributes?.hs_color as [number, number] | undefined;
    if (hs) return hsToCSS(hs);
    return "rgb(255, 200, 100)";
  });

  const vividColor = createMemo(() => {
    const first = entities().find((e) => isEntityActive(e)) ?? entities()[0];
    const hs = first?.attributes?.hs_color as [number, number] | undefined;
    return hs ? hsToCSS(hs) : "oklch(0.86 0.12 80)";
  });

  const activeCount = createMemo(() => entities().filter((e) => isEntityActive(e)).length);

  const name = () =>
    props.config.title ||
    entities()
      .map((e) => e.friendlyName)
      .join(", ") ||
    "Light";

  const eyebrow = createMemo(() => {
    const total = count();
    if (total <= 1) return "Light";
    return groupLine(activeCount(), total, { active: "on", rest: "off" });
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
        color={isOn() ? displayColor() : undefined}
        emptyState={emptyState()}
        class={isDragging() ? "duration-0" : undefined}
      >
        <Show when={hasEntities()}>
          <WidgetSliderFill value={uiBrightness()} isDragging={isDragging()} />
          <Tile active={isOn()} accent={isOn() ? vividColor() : undefined}>
            <TileGlyph icon={isOn() ? "mdi:lightbulb" : "mdi:lightbulb-outline"} />
            <TileHead
              icon={isOn() ? "mdi:lightbulb" : "mdi:lightbulb-outline"}
              eyebrow={eyebrow()}
              name={name()}
              active={isOn()}
              count={count()}
            />
            <TileHero
              value={isOn() ? Math.round(uiBrightness()) : "Off"}
              unit={isOn() ? "%" : undefined}
              art={
                <LampArt
                  kind={props.config.lamp}
                  on={isOn()}
                  brightness={uiBrightness()}
                  color={vividColor()}
                />
              }
            />
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
        {...(extras() ? { sheet: <LightSheet entities={entities()} name={name()} /> } : {})}
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
    configVersion: 1,
    minSize: { w: 1, h: 1 },
    maxSize: { w: 8, h: 8 },
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Single light",
        size: { w: 2, h: 2 },
        config: { title: "Reading Lamp", entityIds: ["light.bedroom_ceiling"], lamp: "desk" },
      },
      {
        label: "Room group",
        size: { w: 3, h: 2 },
        config: {
          title: "Living Room",
          entityIds: ["light.living_room_main", "light.kitchen_counter", "light.hallway"],
          lamp: "floor",
        },
      },
      {
        label: "Color",
        size: { w: 2, h: 2 },
        config: { title: "Studio", entityIds: ["light.studio_rgb"], lamp: "bulb" },
      },
      {
        label: "Colorful group",
        size: { w: 3, h: 2 },
        config: {
          title: "Party Mode",
          entityIds: ["light.studio_rgb", "light.desk_rgb", "light.hallway"],
          lamp: "mushroom",
        },
      },
      {
        label: "Off",
        size: { w: 2, h: 2 },
        config: { title: "Kitchen", entityIds: ["light.kitchen_counter"], lamp: "pendant" },
      },
    ],
  },
  configSchema,
  component: LightWidget,
});
