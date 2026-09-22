import {
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
  WidgetDialog,
  WidgetSliderFill,
  buildDebugData,
  type WidgetDebugData,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import { formatTemperature, shiftBand, useSetpoints, widgetDialogProps } from "../common";
import {
  Tile,
  TileChoice,
  TileControls,
  TileGlyph,
  TileHead,
  TileHero,
  TileStepper,
} from "../common/tile/tile";
import "../common/mode-transition.css";
import { ClimateControls } from "./controls";
import { getHvacModeIcon, getModeColors, HVAC_MODES } from "./utils";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("climate"),
});
type ClimateConfig = Infer<typeof configSchema>;

function ClimateWidget(props: { config: ClimateConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

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
      callService("climate", "set_temperature", data, { entity_id: id });
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
    if (id) callService("climate", "set_hvac_mode", { hvac_mode: m }, { entity_id: id });
  };
  const degrees = (t: number) => t.toFixed(t % 1 === 0 ? 0 : 1);
  const targetLabel = () => {
    const [low, high] = setpoints.values();
    if (low === undefined) return "--";
    if (high === undefined) return degrees(low);
    return (
      <>
        {degrees(low)}
        <span class="tile-unit tile-range-sep">to</span>
        {degrees(high)}
      </>
    );
  };
  const band = () => {
    const v = setpoints.values();
    return v.length === 0 ? undefined : (Math.min(...v) + Math.max(...v)) / 2;
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

  const gestures = useWidgetGestures(() => ({
    hold: { action: openDialog },
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
          <Tile active={hvacMode() !== "off"}>
            <TileGlyph icon={iconName()} />
            <TileHead
              icon={iconName()}
              eyebrow={eyebrow()}
              name={props.config.title || entity()?.friendlyName || "Climate"}
              active={hvacMode() !== "off"}
            />
            <TileHero
              value={hvacMode() === "off" ? "Off" : targetLabel()}
              unit={hvacMode() === "off" ? undefined : "°"}
              class={isRange() && hvacMode() !== "off" ? "tile-hero-range" : undefined}
              sub={subLine()}
            />
            <TileControls>
              <TileStepper
                label="Target temperature"
                onStep={(d) => setpoints.shiftValues(d * step())}
              />
              <TileChoice
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
            </TileControls>
          </Tile>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Climate"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        controlsContent={<ClimateControls entities={entities} />}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<ClimateConfig>({
  manifest: {
    name: "Climate",
    description: "Climate control with temperature, HVAC modes, and fan control",
    icon: "mdi:thermostat",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Thermostat",
        size: { w: 2, h: 2 },
        config: { entityIds: ["climate.living_room_thermostat"], title: "Thermostat" },
      },
    ],
  },
  configSchema,
  component: ClimateWidget,
});
