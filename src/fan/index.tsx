import {
  defineConfig,
  defineWidget,
  field,
  type Infer,
  isEntityActive,
  useEntities,
  useService,
  useToggle,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  WidgetDialog,
  WidgetSliderFill,
  buildDebugData,
  type WidgetDebugData,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import {
  Tile,
  TileChoice,
  TileControls,
  TileGlyph,
  TileHead,
  TileHero,
  TileStepper,
} from "../common/tile/tile";
import pedestalArt from "./assets/fan-pedestal.webp";
import purifierArt from "./assets/fan-purifier.webp";
import { FanControls } from "./controls";
import "./fan.css";

const PRESET_ICONS: Record<string, string> = {
  auto: "mdi:fan-auto",
  sleep: "mdi:power-sleep",
  eco: "mdi:leaf",
  nature: "mdi:weather-windy",
  normal: "mdi:fan",
  turbo: "mdi:fan-plus",
  boost: "mdi:fan-plus",
  smart: "mdi:brain",
};

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("fan"),
});
type FanConfig = Infer<typeof configSchema>;

function FanWidget(props: { config: FanConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

  const entities = useEntities(() => props.config.entityIds);
  const toggle = useToggle();
  const { callService } = useService();

  const { emptyState, hasEntities, count } = useWidgetEntityGroup({
    entities,
    aggregationMode: () => "switch",
    emptyStateConfig: {
      icon: <Icon icon="mdi:fan" width={32} />,
      title: "No fan entity",
      message: "Hold to configure",
    },
  });

  const firstEntity = createMemo(() => entities()[0]);
  const isOn = createMemo(() => {
    const ents = entities();
    return ents.length > 0 && ents.some((e) => isEntityActive(e));
  });
  const activeCount = createMemo(() => entities().filter((e) => isEntityActive(e)).length);
  const isUnavailable = createMemo(() => {
    const state = firstEntity()?.state;
    return count() === 1 && (state === "unavailable" || state === "unknown");
  });

  // Fans without SET_SPEED expose neither percentage nor percentage_step.
  const supportsSpeed = createMemo(() => {
    const a = firstEntity()?.attributes;
    return a?.percentage !== undefined || a?.percentage_step !== undefined;
  });

  const serverPercentage = createMemo(() => {
    const first = firstEntity();
    if (first?.state !== "on") return 0;
    const pct = first.attributes?.percentage as number | undefined;
    return pct ?? 100;
  });

  const [uiPercentage, setUiPercentage] = createSignal(serverPercentage());
  const [isDragging, setIsDragging] = createSignal(false);

  // Sync server percentage to UI when not dragging
  createEffect(() => {
    const sp = serverPercentage();
    if (!isDragging()) setUiPercentage(sp);
  });

  let slideDebounce: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => {
    if (slideDebounce) clearTimeout(slideDebounce);
  });

  const handleSpeedSlide = (value: number) => {
    setIsDragging(true);
    setUiPercentage(value);
    if (slideDebounce) clearTimeout(slideDebounce);
    slideDebounce = setTimeout(() => {
      setIsDragging(false);
      for (const e of entities()) {
        callService(
          "fan",
          "set_percentage",
          { percentage: Math.round(value) },
          { entity_id: e.id },
        );
      }
    }, 300);
  };

  const handleTap = async () => {
    const ids = entities().map((e) => e.id);
    if (ids.length === 0) return;
    await toggle(ids);
  };

  const gestures = useWidgetGestures(() => ({
    tap: handleTap,
    ...(supportsSpeed()
      ? {
          slide: {
            value: uiPercentage(),
            onChange: handleSpeedSlide,
            min: 0,
            max: 100,
            orientation: "auto" as const,
            activationDelay: 0,
          },
        }
      : {}),
    hold: { action: openDialog },
  }));
  onCleanup(gestures.dispose);

  const name = () =>
    props.config.title ||
    entities()
      .map((e) => e.friendlyName)
      .join(", ") ||
    "Fan";
  const presets = createMemo(() =>
    ((firstEntity()?.attributes?.preset_modes as string[] | undefined) ?? []).slice(0, 3),
  );
  const presetIcon = (p: string) => PRESET_ICONS[p.toLowerCase()] ?? "mdi:fan";
  const heroValue = () => {
    if (isUnavailable()) return "--";
    if (!isOn()) return "Off";
    if (count() > 1) return `${activeCount()}/${count()}`;
    return supportsSpeed() ? Math.round(uiPercentage()) : "On";
  };
  const eyebrow = () => {
    if (isUnavailable()) return "Unavailable";
    const preset = firstEntity()?.attributes?.preset_mode as string | undefined;
    if (isOn() && preset) return `${preset.charAt(0).toUpperCase()}${preset.slice(1)}`;
    return count() > 1 ? `${count()} fans` : "Fan";
  };
  const stepSpeed = (direction: -1 | 1) => {
    const step = (firstEntity()?.attributes?.percentage_step as number | undefined) ?? 10;
    const next = Math.min(100, Math.max(0, Math.round(uiPercentage() + direction * step)));
    handleSpeedSlide(next);
  };

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const ents = entities();
    if (ents.length === 0) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, ents, {
      uiPercentage: uiPercentage(),
    });
  });

  return (
    <>
      <Widget
        gestures={gestures}
        variant="classic-glass"
        tone={isOn() ? "success" : "neutral"}
        emptyState={emptyState()}
        class={isDragging() ? "duration-0" : undefined}
      >
        <Show when={hasEntities()}>
          <Show when={supportsSpeed()}>
            <WidgetSliderFill value={uiPercentage()} isDragging={isDragging()} />
          </Show>
          <Tile active={isOn()}>
            <TileGlyph icon={isOn() ? "mdi:fan" : "mdi:fan-off"} />
            <TileHead
              icon={isOn() ? "mdi:fan" : "mdi:fan-off"}
              eyebrow={eyebrow()}
              name={name()}
              active={isOn()}
              count={entities().length}
            />
            <TileHero
              value={heroValue()}
              unit={isOn() && supportsSpeed() && count() === 1 ? "%" : undefined}
              art={
                <img
                  src={/purif|air/i.test(name()) ? purifierArt : pedestalArt}
                  alt=""
                  class="fan-object"
                  data-on={isOn() || undefined}
                />
              }
            />
            <Show when={supportsSpeed() || presets().length > 0}>
              <TileControls>
                <Show when={supportsSpeed()} fallback={<span />}>
                  <TileStepper label="Fan speed" onStep={(d) => stepSpeed(d)} />
                </Show>
                <Show when={presets().length > 0}>
                  <TileChoice
                    label="Preset"
                    tone="var(--widget-color)"
                    value={firstEntity()?.attributes?.preset_mode as string}
                    options={presets().map((p) => ({ value: p, icon: presetIcon(p), label: p }))}
                    onChange={(p) => {
                      for (const e of entities()) {
                        callService(
                          "fan",
                          "set_preset_mode",
                          { preset_mode: p },
                          { entity_id: e.id },
                        );
                      }
                    }}
                  />
                </Show>
              </TileControls>
            </Show>
          </Tile>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Fan"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        controlsContent={<FanControls entities={entities} />}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<FanConfig>({
  manifest: {
    name: "Fan",
    description: "Fan control with speed, presets, oscillation, and direction",
    icon: "mdi:fan",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^1.4.0",
    examples: [
      {
        label: "Ceiling fan",
        size: { w: 2, h: 2 },
        config: { entityIds: ["fan.bedroom_ceiling"], title: "Bedroom Fan" },
      },
      {
        label: "Purifier",
        size: { w: 2, h: 2 },
        config: { entityIds: ["fan.air_purifier"] },
      },
    ],
  },
  configSchema,
  component: FanWidget,
});
