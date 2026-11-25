import {
  buildDebugData,
  defineConfig,
  defineWidget,
  field,
  Icon,
  type Infer,
  isDark,
  useEntities,
  useService,
  useTranslation,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  type WidgetDebugData,
  WidgetDialog,
  WidgetSliderFill,
} from "@glasshome/widget-sdk";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import { shiftBand, useThermostat, widgetDialogProps } from "../common";
import "../common/mode-transition.css";
import { ART } from "./art";
import "./climate.css";
import { ClimateSheet, climateHasExtras } from "./sheet";
import { getHvacModeIcon, getModeColors } from "./utils";
import { actionWord, climateSub, degrees, hvacWord, targetText } from "./words";
import en from "./locales/en.json";

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
type ClimateConfig = Infer<typeof configSchema>;

function ClimateWidget(props: { config: ClimateConfig }) {
  const ctx = useWidgetContext();
  const tools = useTranslation();
  const { t } = tools;
  const { setShowDialog, dialogProps } = useWidgetDialog();

  const entities = useEntities(() => props.config.entityIds);

  const { emptyState, hasEntities } = useWidgetEntityGroup({
    entities,
    aggregationMode: () => "none",
    emptyStateConfig: {
      icon: <Icon icon="mdi:thermostat" width={32} />,
      title: t("climate.empty.title"),
      message: t("climate.empty.message"),
    },
  });

  const entity = createMemo(() => entities()[0]);
  const hvacMode = createMemo(() => (entity()?.state ?? "off") as string);

  const currentTemp = createMemo(
    () => entity()?.attributes?.current_temperature as number | undefined,
  );
  const thermostat = useThermostat(entity);
  const { setpoints, min: minTemp, max: maxTemp, step, unit: tempUnit, isRange } = thermostat;
  const hvacAction = createMemo(() => entity()?.attributes?.hvac_action as string | undefined);

  const iconName = createMemo(() => getHvacModeIcon(hvacMode()));
  const mode = createMemo(() => getModeColors(hvacMode(), isDark()));

  const { callService } = useService();
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
  const targetLabel = () => {
    const [low, high] = setpoints.values();
    if (low === undefined) return "--";
    if (high === undefined) return degrees(tools, low);
    return (
      <>
        {degrees(tools, low)}
        <span class="glasshome-widget-unit climate-range-sep">{t("climate.hero.to")}</span>
        {degrees(tools, high)}
      </>
    );
  };
  const targetReading = () => targetText(tools, setpoints.values(), tempUnit());
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
    const e = entity();
    if (e && action && action !== "idle" && action !== "off") return actionWord(tools, e, action);
    return hvacWord(tools, e, hvacMode(), (raw) => raw);
  });
  const subLine = createMemo(() =>
    climateSub(tools, {
      current: currentTemp(),
      humidity: entity()?.attributes?.current_humidity as number | undefined,
      unit: tempUnit(),
    }),
  );

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
              name={props.config.title || entity()?.friendlyName || t("climate.name")}
              active={hvacMode() !== "off"}
              count={entities().length}
            />
            <Widget.Hero
              value={
                hvacMode() === "off"
                  ? hvacWord(tools, entity(), "off", (raw) => raw)
                  : targetLabel()
              }
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
                label={
                  targetReading()
                    ? t("climate.controls.target-at", { value: targetReading() ?? "" })
                    : t("climate.controls.target")
                }
                onStep={(d) => setpoints.shiftValues(d * step())}
              />
              <Widget.Choice
                label={t("climate.controls.mode")}
                tone={mode().color}
                value={hvacMode()}
                options={modes().map((m) => ({
                  value: m,
                  icon: getHvacModeIcon(m),
                  label: hvacWord(tools, entity(), m, (raw) => raw),
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
        title={props.config.title || entity()?.friendlyName || t("climate.name")}
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
                  {(e) => <ClimateSheet entity={e()} thermostat={thermostat} />}
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
  messages: en,
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
