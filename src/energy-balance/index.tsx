import {
  defineWidget,
  ToggleGroup,
  ToggleGroupItem,
  useDaylight,
  useEntities,
  useEntityStatistics,
  useReducedMotion,
  useTranslation,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { EnergyEmptyState, normalizeBidirectional } from "../_energy-shared";
import { widgetDialogProps } from "../common";
import { deriveBalance } from "./balance";
import { configSchema, type EnergyBalanceConfig } from "./config";
import { SkyScene } from "./sky";
import { type BalanceInput, balanceReadout, balanceSubLine, type Mode } from "./words";
import { skyScene } from "./sun-path";
import "./balance.css";
import en from "./locales/en.json";

type ValueUnit = "W" | "kWh";

const STATS_REFRESH_MS = 5 * 60 * 1000;
// Below this measured height the produced-vs-used bars can't breathe, so the
// compact single balance bar shows instead.
const _COMPACT_HEIGHT = 210;

const MODES: Mode[] = ["live", "today", "week", "month"];
const MODE_LABEL: Record<Mode, string> = {
  live: "energy-balance.mode.live",
  today: "energy-balance.mode.today",
  week: "energy-balance.mode.week",
  month: "energy-balance.mode.month",
};

function sumChange(values: { change?: number }[] | undefined): number {
  if (!values) return 0;
  return values.reduce((total, v) => total + (v.change ?? 0), 0);
}

function firstId(ids: string[]): string {
  return ids[0] ?? "";
}

function EnergyBalanceWidget(props: { config: EnergyBalanceConfig }) {
  const ctx = useWidgetContext();
  const tools = useTranslation();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();
  const _reducedMotion = useReducedMotion();
  const [mode, setMode] = createSignal<Mode>("today");

  // Bumping the tick hands useEntityStatistics a fresh options object, re-running the daily query.
  const [tick, setTick] = createSignal(0);
  onMount(() => {
    const iv = setInterval(() => setTick((t) => t + 1), STATS_REFRESH_MS);
    onCleanup(() => clearInterval(iv));
  });

  // Window start for the statistics query: today's / this week's / this month's
  // midnight. Live mode uses today's window (its value comes from live power).
  const dayOptions = createMemo(() => {
    tick();
    const start = new Date();
    const m = mode();
    if (m === "week") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    else if (m === "month") start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { startTime: start, period: "day" as const };
  });

  const stat = (id: () => string) => useEntityStatistics(id, dayOptions);
  const solar = stat(() => firstId(props.config.solarEnergyEntity));
  const gridIn = stat(() => firstId(props.config.gridImportEnergyEntity));
  const gridOut = stat(() => firstId(props.config.gridExportEnergyEntity));
  const battIn = stat(() => firstId(props.config.batteryChargeEnergyEntity));
  const battOut = stat(() => firstId(props.config.batteryDischargeEnergyEntity));
  const home = stat(() => firstId(props.config.homeEnergyEntity));

  const livePowerIds = createMemo(() =>
    [
      firstId(props.config.gridImportPowerEntity),
      firstId(props.config.gridExportPowerEntity),
      firstId(props.config.gridSignedPowerEntity),
      firstId(props.config.solarPowerEntity),
      firstId(props.config.homePowerEntity),
    ].filter((id) => id.length > 0),
  );
  const liveEntities = useEntities(livePowerIds);
  const liveMap = createMemo(() => {
    const map = new Map<string, number>();
    for (const e of liveEntities()) {
      const n = Number(e.state);
      if (Number.isFinite(n)) map.set(e.id, n);
    }
    return map;
  });
  const liveSolarW = () => liveMap().get(firstId(props.config.solarPowerEntity)) ?? 0;
  const liveHomeW = () => liveMap().get(firstId(props.config.homePowerEntity)) ?? 0;

  const netW = createMemo(() => {
    const map = liveMap();
    const signedId = firstId(props.config.gridSignedPowerEntity);
    if (signedId && map.has(signedId)) {
      const n = normalizeBidirectional({ signed: map.get(signedId) ?? 0 });
      return n.import - n.export;
    }
    const n = normalizeBidirectional({
      importValue: map.get(firstId(props.config.gridImportPowerEntity)) ?? 0,
      exportValue: map.get(firstId(props.config.gridExportPowerEntity)) ?? 0,
    });
    return n.import - n.export;
  });

  // Solar is optional: a grid-only home balances grid import against consumption.
  const configured = createMemo(() => {
    const hasStats =
      firstId(props.config.homeEnergyEntity).length > 0 ||
      firstId(props.config.gridImportEnergyEntity).length > 0;
    const hasLive = firstId(props.config.homePowerEntity).length > 0;
    return hasStats || hasLive;
  });

  const balance = createMemo(() =>
    deriveBalance(
      {
        producedKWh: sumChange(solar()),
        gridImportKWh: sumChange(gridIn()),
        gridExportKWh: sumChange(gridOut()),
        batteryChargeKWh: sumChange(battIn()),
        batteryDischargeKWh: sumChange(battOut()),
        homeKWh: firstId(props.config.homeEnergyEntity).length > 0 ? sumChange(home()) : null,
      },
      netW(),
      configured(),
    ),
  );

  const isLive = () => mode() === "live";
  const produced = () => (isLive() ? liveSolarW() : balance().producedKWh);
  const consumed = () => (isLive() ? liveHomeW() : balance().consumedKWh);
  const dataUnit = (): ValueUnit => (isLive() ? "W" : "kWh");
  // Without a solar sensor there is nothing to weigh consumption against, so
  // the produced side and the balance bar stay hidden.
  const hasSolar = () =>
    isLive()
      ? firstId(props.config.solarPowerEntity).length > 0
      : firstId(props.config.solarEnergyEntity).length > 0;

  // -1 draws entirely from the grid, 0 matches, +1 all surplus.
  const _dayBalance = createMemo(() => {
    const p = produced();
    const c = consumed();
    const total = p + c;
    if (total <= 0) return 0;
    return Math.max(-1, Math.min(1, (p - c) / total));
  });
  const balanceInput = (): BalanceInput => ({
    mode: mode(),
    produced: produced(),
    consumed: consumed(),
    unit: dataUnit(),
    hasSolar: hasSolar(),
  });
  const readout = createMemo(() => balanceReadout(tools, balanceInput()));

  const headIcon = () => (hasSolar() ? "mdi:solar-power-variant" : "mdi:transmission-tower");
  const daylight = useDaylight();
  const cycleMode = () => setMode((m) => MODES[(MODES.indexOf(m) + 1) % MODES.length]);
  const gestures = useWidgetGestures(() => ({ tap: cycleMode }));
  onCleanup(gestures.dispose);

  return (
    <>
      <Widget gestures={gestures} variant="classic-glass" color="var(--tone-accent)">
        <Show
          when={configured()}
          fallback={
            <Widget.Content>
              <EnergyEmptyState kind="unconfigured" onConfigure={openDialog} />
            </Widget.Content>
          }
        >
          <Widget.Content class={skyScene(daylight().phase) === "day" ? undefined : "dark"}>
            <Widget.Backdrop>
              <SkyScene glow={Math.min(1, liveSolarW() / 4000)} />
            </Widget.Backdrop>
            <Widget.Glyph icon={headIcon()} />
            <Widget.Head
              icon={headIcon()}
              eyebrow={readout().caption}
              name={props.config.title || tools.t("energy-balance.title")}
              homeName={Boolean(props.config.title)}
              active={readout().tone === "surplus"}
            />
            <Widget.Hero
              value={readout().value}
              unit={readout().unit ? ` ${readout().unit}` : undefined}
              sub={balanceSubLine(tools, balanceInput())}
            />
            <Widget.Controls>
              <ToggleGroup
                aria-label={tools.t("energy-balance.period")}
                value={mode()}
                onChange={(v: string | null) => v && setMode(v as Mode)}
                class="balance-modes"
              >
                <For each={MODES}>
                  {(m) => (
                    <ToggleGroupItem value={m} class="balance-mode">
                      {tools.t(MODE_LABEL[m])}
                    </ToggleGroupItem>
                  )}
                </For>
              </ToggleGroup>
            </Widget.Controls>
          </Widget.Content>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title={tools.t("energy-balance.title")}
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
      />
    </>
  );
}

export default defineWidget<EnergyBalanceConfig>({
  messages: en,
  manifest: {
    name: "Energy Balance",
    description: "Today's self-sufficiency: how much of your home ran on solar vs the grid",
    icon: "mdi:solar-power",
    minSize: { w: 2, h: 2 },
    maxSize: { w: 8, h: 8 },
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Solar and battery",
        size: { w: 3, h: 3 },
        config: {
          title: "Energy Balance",
          solarEnergyEntity: ["sensor.solar_power"],
          gridImportEnergyEntity: ["sensor.grid_import_power"],
          gridExportEnergyEntity: ["sensor.grid_export_power"],
          batteryChargeEnergyEntity: ["sensor.battery_charge_power"],
          batteryDischargeEnergyEntity: ["sensor.battery_discharge_power"],
          homeEnergyEntity: [],
          gridImportPowerEntity: ["sensor.grid_import_power"],
          gridExportPowerEntity: ["sensor.grid_export_power"],
          gridSignedPowerEntity: [],
          solarPowerEntity: ["sensor.solar_power"],
          homePowerEntity: ["sensor.home_power"],
        },
      },
      {
        label: "Grid only",
        size: { w: 2, h: 2 },
        config: {
          title: "Electricity",
          solarEnergyEntity: [],
          gridImportEnergyEntity: ["sensor.grid_import_power"],
          gridExportEnergyEntity: [],
          batteryChargeEnergyEntity: [],
          batteryDischargeEnergyEntity: [],
          homeEnergyEntity: ["sensor.home_power"],
          gridImportPowerEntity: ["sensor.grid_import_power"],
          gridExportPowerEntity: [],
          gridSignedPowerEntity: [],
          solarPowerEntity: [],
          homePowerEntity: ["sensor.home_power"],
        },
      },
      {
        label: "Wide",
        size: { w: 4, h: 2 },
        config: {
          title: "Energy Balance",
          solarEnergyEntity: ["sensor.solar_power"],
          gridImportEnergyEntity: ["sensor.grid_import_power"],
          gridExportEnergyEntity: ["sensor.grid_export_power"],
          batteryChargeEnergyEntity: ["sensor.battery_charge_power"],
          batteryDischargeEnergyEntity: ["sensor.battery_discharge_power"],
          homeEnergyEntity: [],
          gridImportPowerEntity: ["sensor.grid_import_power"],
          gridExportPowerEntity: ["sensor.grid_export_power"],
          gridSignedPowerEntity: [],
          solarPowerEntity: ["sensor.solar_power"],
          homePowerEntity: ["sensor.home_power"],
        },
      },
      {
        label: "Large",
        size: { w: 4, h: 4 },
        config: {
          title: "Energy Balance",
          solarEnergyEntity: ["sensor.solar_power"],
          gridImportEnergyEntity: ["sensor.grid_import_power"],
          gridExportEnergyEntity: ["sensor.grid_export_power"],
          batteryChargeEnergyEntity: ["sensor.battery_charge_power"],
          batteryDischargeEnergyEntity: ["sensor.battery_discharge_power"],
          homeEnergyEntity: [],
          gridImportPowerEntity: ["sensor.grid_import_power"],
          gridExportPowerEntity: ["sensor.grid_export_power"],
          gridSignedPowerEntity: [],
          solarPowerEntity: ["sensor.solar_power"],
          homePowerEntity: ["sensor.home_power"],
        },
      },
    ],
  },
  configSchema,
  component: EnergyBalanceWidget,
});
