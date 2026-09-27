import {
  buildDebugData,
  defineConfig,
  defineWidget,
  field,
  type Infer,
  isDark,
  useEntities,
  useService,
  useTemperatureUnit,
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
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import { formatTemperature, shiftBand, useSetpoints, widgetDialogProps } from "../common";
import "../common/mode-transition.css";
import acArt from "./assets/climate-ac.webp";
import heatpumpArt from "./assets/climate-heatpump.webp";
import radiatorArt from "./assets/climate-radiator.webp";
import thermostatArt from "./assets/climate-thermostat.webp";
import "./climate.css";
import { ClimateSheet, climateHasExtras } from "./sheet";
import { getHvacModeIcon, getModeColors, HVAC_MODES } from "./utils";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entity("climate"),
  art: field.choice(["thermostat", "radiator", "ac", "heatpump"], {
    title: "Device picture",
    default: "thermostat",
    labels: {
      thermostat: "Thermostat",
      radiator: "Radiator",
      ac: "Air conditioner",
      heatpump: "Heat pump",
    },
    icons: {
      thermostat: "mdi:thermostat",
      radiator: "mdi:radiator",
      ac: "mdi:air-conditioner",
      heatpump: "mdi:heat-pump-outline",
    },
  }),
});
const ART = { thermostat: thermostatArt, radiator: radiatorArt, ac: acArt, heatpump: heatpumpArt };
type ClimateConfig = Infer<typeof configSchema>;

function ClimateWidget(props: { config: ClimateConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, dialogProps } = useWidgetDialog();

  const entities = useEntities(() => props.config.entityIds);

  const { emptyState, hasEntities } = useWidgetEntityGroup({
    entities,
    aggregationMode: () => "none",
    emptyStateConfig: {
      icon: <Icon icon="mdi:thermostat" width={32} />,
      title: "No climate entity",
      message: "Hold to configure",
    },
  });

  const entity = createMemo(() => entities()[0]);
  const hvacMode = createMemo(() => (entity()?.state ?? "off") as string);

  const currentTemp = createMemo(
    () => entity()?.attributes?.current_temperature as number | undefined,
  );
  const stateSetpoints = createMemo(() => {
    const a = entity()?.attributes;
    const low = a?.target_temp_low as number | undefined;
    const high = a?.target_temp_high as number | undefined;
    if (low != null && high != null) return [low, high];
    const t = a?.temperature as number | undefined;
    return t == null ? [] : [t];
  });
  const isRange = () => stateSetpoints().length === 2;
  const hvacAction = createMemo(() => entity()?.attributes?.hvac_action as string | undefined);
  const temperatureUnit = useTemperatureUnit();
  const tempUnit = createMemo(() => {
    const unit = entity()?.attributes?.temperature_unit as string | undefined;
    return (unit ?? temperatureUnit()).replace("°", "");
  });

  const iconName = createMemo(() => getHvacModeIcon(hvacMode()));
  // isDark() is called inside the memo so re-evaluation on mode() change
  // also re-reads the theme; live theme-toggle without a mode change picks up
  // on next memo invalidation (acceptable per CONTEXT D-10 / T-29-04).
  const mode = createMemo(() => getModeColors(hvacMode(), isDark()));

  const { callService } = useService();
  const step = () =>
    (entity()?.attributes?.target_temp_step as number | undefined) ??
    (tempUnit() === "F" ? 1 : 0.5);
  const minTemp = () => (entity()?.attributes?.min_temp as number | undefined) ?? 7;
  const maxTemp = () => (entity()?.attributes?.max_temp as number | undefined) ?? 35;
  const setpoints = useSetpoints({
    stateValues: stateSetpoints,
    min: minTemp,
    max: maxTemp,
    step,
    commit: (values) => {
      const id = entity()?.id;
      if (!id) return;
      const data =
        values.length === 2
          ? { target_temp_low: values[0], target_temp_high: values[1] }
          : { temperature: values[0] };
      void callService("climate", "set_temperature", data, { entity_id: id });
    },
  });
  const modes = createMemo(() => {
    const offered = (entity()?.attributes?.hvac_modes as string[] | undefined) ?? [];
    const quick = offered
      .filter((m) => ["off", "heat", "cool", "heat_cool", "auto"].includes(m))
      .slice(0, 3);
    const current = hvacMode();
    return quick.includes(current) || !offered.includes(current)
      ? quick
      : [...quick.slice(0, 2), current];
  });
  const setMode = (m: string) => {
    const id = entity()?.id;
    if (id) void callService("climate", "set_hvac_mode", { hvac_mode: m }, { entity_id: id });
  };
  const degrees = (t: number) => t.toFixed(t % 1 === 0 ? 0 : 1);
  const targetLabel = () => {
    const [low, high] = setpoints.values();
    if (low === undefined) return "--";
    if (high === undefined) return degrees(low);
    return (
      <>
        {degrees(low)}
        <span class="glasshome-widget-unit climate-range-sep">to</span>
        {degrees(high)}
      </>
    );
  };
  const band = () => {
    const v = setpoints.values();
    return v.length === 0 ? undefined : (Math.min(...v) + Math.max(...v)) / 2;
  };
  const running = () => {
    const action = hvacAction();
    return !!action && action !== "idle" && action !== "off";
  };
  const eyebrow = createMemo(() => {
    const action = hvacAction();
    if (action && action !== "idle" && action !== "off")
      return action.charAt(0).toUpperCase() + action.slice(1);
    return HVAC_MODES[hvacMode()]?.label ?? hvacMode();
  });
  const subLine = createMemo(() => {
    const ct = currentTemp();
    const hum = entity()?.attributes?.current_humidity as number | undefined;
    return [
      ct === undefined ? undefined : `Now ${formatTemperature(ct, tempUnit())}`,
      hum === undefined ? undefined : `${hum}%`,
    ]
      .filter(Boolean)
      .join(" · ");
  });

  const [dragging, setDragging] = createSignal(false);
  const fillPercent = () => {
    const t = band();
    if (t === undefined) return 0;
    return ((t - minTemp()) / (maxTemp() - minTemp())) * 100;
  };
  let dragCommit: ReturnType<typeof setTimeout> | undefined;
  const onSlide = (percent: number) => {
    setDragging(true);
    const mid = band();
    if (mid === undefined) return;
    const raw = minTemp() + (percent / 100) * (maxTemp() - minTemp());
    const delta = Math.round((raw - mid) / step()) * step();
    const next = shiftBand(setpoints.values(), delta, minTemp(), maxTemp());
    setpoints.setPending(next);
    if (dragCommit) clearTimeout(dragCommit);
    dragCommit = setTimeout(() => {
      setDragging(false);
      setpoints.commitValues(next);
    }, 300);
  };

  const extras = createMemo(() => {
    const e = entity();
    return !!e && climateHasExtras(e);
  });

  const gestures = useWidgetGestures(() => ({
    slide:
      hvacMode() === "off"
        ? undefined
        : {
            value: fillPercent(),
            onChange: onSlide,
            min: 0,
            max: 100,
            orientation: "auto" as const,
            activationDelay: 0,
          },
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
        color={mode().color}
        colorTo={mode().colorTo}
        emptyState={emptyState()}
        class="widget-mode-transition"
      >
        <Show when={hasEntities()}>
          <Show when={hvacMode() !== "off"}>
            <WidgetSliderFill value={fillPercent()} isDragging={dragging()} />
          </Show>
          <Widget.Content>
            <Widget.Glyph icon={iconName()} />
            <Widget.Head
              icon={iconName()}
              eyebrow={eyebrow()}
              name={props.config.title || entity()?.friendlyName || "Climate"}
              active={hvacMode() !== "off"}
              count={entities().length}
            />
            <Widget.Hero
              value={hvacMode() === "off" ? "Off" : targetLabel()}
              unit={hvacMode() === "off" ? undefined : "°"}
              class={isRange() && hvacMode() !== "off" ? "climate-range" : undefined}
              sub={subLine()}
              art={
                <img
                  src={ART[props.config.art]}
                  alt=""
                  class="climate-object"
                  data-on={hvacMode() !== "off" || undefined}
                  data-running={running() || undefined}
                />
              }
            />
            <Widget.Controls>
              <Widget.Stepper
                label="Target temperature"
                onStep={(d) => setpoints.shiftValues(d * step())}
              />
              <Widget.Choice
                label="Mode"
                tone={mode().color}
                value={hvacMode()}
                options={modes().map((m) => ({
                  value: m,
                  icon: getHvacModeIcon(m),
                  label: HVAC_MODES[m]?.label ?? m,
                }))}
                onChange={setMode}
              />
            </Widget.Controls>
          </Widget.Content>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title={props.config.title || entity()?.friendlyName || "Climate"}
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        {...(extras()
          ? {
              sheet: () => (
                <Show when={entity()}>
                  {(e) => (
                    <ClimateSheet
                      entity={e()}
                      setpoints={setpoints}
                      min={minTemp()}
                      max={maxTemp()}
                      step={step()}
                    />
                  )}
                </Show>
              ),
            }
          : {})}
        debugData={debugData()}
        tile={{ icon: iconName(), tone: hvacMode() !== "off" ? mode().color : undefined }}
      />
    </>
  );
}

export default defineWidget<ClimateConfig>({
  manifest: {
    name: "Climate",
    description: "Climate control with temperature, HVAC modes, and fan control",
    icon: "mdi:thermostat",
    configVersion: 2,
    minSize: { w: 1, h: 1 },
    maxSize: { w: 8, h: 8 },
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Thermostat",
        size: { w: 2, h: 2 },
        config: {
          entityIds: ["climate.living_room_thermostat"],
          title: "Thermostat",
          art: "thermostat",
        },
      },
      {
        label: "Radiator heating",
        size: { w: 3, h: 2 },
        config: {
          entityIds: ["climate.living_room_thermostat"],
          title: "Living Room",
          art: "radiator",
        },
      },
      {
        label: "Air conditioner off",
        size: { w: 2, h: 2 },
        config: { entityIds: ["climate.bedroom_ac"], title: "Bedroom", art: "ac" },
      },
      {
        label: "Heat pump",
        size: { w: 4, h: 3 },
        config: {
          entityIds: ["climate.living_room_thermostat"],
          title: "Heat Pump",
          art: "heatpump",
        },
      },
      {
        label: "Compact",
        size: { w: 2, h: 1 },
        config: {
          entityIds: ["climate.living_room_thermostat"],
          title: "Thermostat",
          art: "thermostat",
        },
      },
      {
        label: "Air conditioner, wide",
        size: { w: 4, h: 2 },
        config: { entityIds: ["climate.bedroom_ac"], title: "Bedroom", art: "ac" },
      },
      {
        label: "Large thermostat",
        size: { w: 6, h: 6 },
        config: {
          entityIds: ["climate.living_room_thermostat"],
          title: "Thermostat",
          art: "thermostat",
        },
      },
    ],
  },
  configSchema,
  // v2 picks one thermostat; a v1 group already showed only its first.
  migrate: (config) => {
    const ids = Array.isArray(config.entityIds) ? config.entityIds : [];
    return { ...config, entityIds: ids.slice(0, 1) };
  },
  component: ClimateWidget,
});
