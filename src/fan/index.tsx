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
import { groupLine } from "../common/group";
import { Tile, TileChoice, TileControls, TileGlyph, TileHead, TileHero } from "../common/tile/tile";
import pedestalArt from "./assets/fan-pedestal.webp";
import purifierArt from "./assets/fan-purifier.webp";
import "./fan.css";
import { FanSheet, fanHasExtras } from "./sheet";

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
  art: field.choice(["pedestal", "purifier"], {
    title: "Fan picture",
    default: "pedestal",
    labels: { pedestal: "Standing fan", purifier: "Air purifier" },
    icons: { pedestal: "mdi:fan", purifier: "mdi:air-purifier" },
  }),
});
type FanConfig = Infer<typeof configSchema>;

function FanWidget(props: { config: FanConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

  const entities = useEntities(() => props.config.entityIds);
  const { callService, turnOn, turnOff } = useService();

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
    await (isOn() ? turnOff(ids) : turnOn(ids));
  };

  const extras = createMemo(() => fanHasExtras(entities()));

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
    hold: extras() ? { action: openDialog } : undefined,
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
    if (count() > 1) return "On";
    return supportsSpeed() ? Math.round(uiPercentage()) : "On";
  };
  const eyebrow = () => {
    if (isUnavailable()) return "Unavailable";
    if (count() > 1) return groupLine(activeCount(), count(), { active: "on", rest: "off" });
    const preset = firstEntity()?.attributes?.preset_mode as string | undefined;
    if (isOn() && preset) return `${preset.charAt(0).toUpperCase()}${preset.slice(1)}`;
    return "Fan";
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
                  src={props.config.art === "purifier" ? purifierArt : pedestalArt}
                  alt=""
                  class="fan-object"
                  data-on={isOn() || undefined}
                />
              }
            />
            <Show when={presets().length > 0}>
              <TileControls>
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
              </TileControls>
            </Show>
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
        {...(extras()
          ? {
              sheet: <FanSheet entities={entities()} name={name()} presetIcon={presetIcon} />,
            }
          : {})}
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
    configVersion: 1,
    minSize: { w: 1, h: 1 },
    maxSize: { w: 8, h: 8 },
    sdkVersion: "^1.4.0",
    examples: [
      {
        label: "Ceiling fan",
        size: { w: 2, h: 2 },
        config: { entityIds: ["fan.bedroom_ceiling"], title: "Bedroom Fan", art: "pedestal" },
      },
      {
        label: "Purifier",
        size: { w: 2, h: 2 },
        config: { entityIds: ["fan.air_purifier"], art: "purifier" },
      },
    ],
  },
  configSchema,
  component: FanWidget,
});
