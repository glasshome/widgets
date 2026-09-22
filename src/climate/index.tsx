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
import { formatTemperature, useSetpoints, widgetDialogProps } from "../common";
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
  const targetTemp = createMemo(() => entity()?.attributes?.temperature as number | undefined);
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
    stateValues: () => {
      const t = targetTemp();
      return t === undefined ? [] : [t];
    },
    min: minTemp,
    max: maxTemp,
    step,
    commit: (values) => {
      const id = entity()?.id;
      if (id)
        callService("climate", "set_temperature", { temperature: values[0] }, { entity_id: id });
    },
  });
  const modes = createMemo(() =>
    ((entity()?.attributes?.hvac_modes as string[] | undefined) ?? [])
      .filter((m) => ["heat", "cool", "auto", "heat_cool", "off"].includes(m))
      .slice(0, 3),
  );
  const setMode = (m: string) => {
    const id = entity()?.id;
    if (id) callService("climate", "set_hvac_mode", { hvac_mode: m }, { entity_id: id });
  };
  const targetLabel = () => {
    const t = setpoints.values()[0];
    return t === undefined ? "--" : t.toFixed(t % 1 === 0 ? 0 : 1);
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
    const t = setpoints.values()[0];
    if (t === undefined) return 0;
    return ((t - minTemp()) / (maxTemp() - minTemp())) * 100;
  };
  let dragCommit: ReturnType<typeof setTimeout> | undefined;
  const onSlide = (percent: number) => {
    setDragging(true);
    const raw = minTemp() + (percent / 100) * (maxTemp() - minTemp());
    const next = Math.round(raw / step()) * step();
    setpoints.setPending([next]);
    if (dragCommit) clearTimeout(dragCommit);
    dragCommit = setTimeout(() => {
      setDragging(false);
      setpoints.commitValues([next]);
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
              sub={subLine()}
            />
            <TileControls>
              <TileStepper
                label="Target temperature"
                onStep={(d) => setpoints.stepValue(0, d * step())}
              />
              <TileChoice
                label="Mode"
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
