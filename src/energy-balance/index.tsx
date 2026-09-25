import {
  defineWidget,
  svgColors,
  ToggleGroup,
  ToggleGroupItem,
  useDaylight,
  useEntities,
  useEntityStatistics,
  useReducedMotion,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { EnergyEmptyState, formatPower, normalizeBidirectional } from "../_energy-shared";
import { widgetDialogProps } from "../common";
import {
  TILE_INNER_RADIUS,
  Tile,
  TileBackdrop,
  TileControls,
  TileGlyph,
  TileHead,
  TileHero,
} from "../common/tile/tile";
import { deriveBalance } from "./balance";
import { configSchema, type EnergyBalanceConfig } from "./config";
import { SkyScene } from "./sky";
import { skyScene } from "./sun-path";
import "./balance.css";

type ValueUnit = "W" | "kWh";

const STATS_REFRESH_MS = 5 * 60 * 1000;
// Below this measured height the produced-vs-used bars can't breathe, so the
// compact single balance bar shows instead.
const _COMPACT_HEIGHT = 210;
const AMBER = svgColors.solar.solid;
const BLUE = svgColors.grid.solid;

type Mode = "live" | "today" | "week" | "month";
const MODES: Mode[] = ["live", "today", "week", "month"];
const MODE_LABEL: Record<Mode, string> = {
  live: "Now",
  today: "Today",
  week: "Week",
  month: "Month",
};
const MODE_WHEN: Record<Mode, string> = {
  live: "now",
  today: "today",
  week: "this week",
  month: "this month",
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
  const readout = createMemo(() => {
    const when = MODE_WHEN[mode()];
    const p = produced();
    const c = consumed();
    const drawn = hasSolar() ? `grid top-up ${when}` : `from the grid ${when}`;
    if (dataUnit() === "W") {
      const diff = p - c;
      if (Math.abs(diff) < 50) return { value: "Balanced", unit: "", caption: when, color: "" };
      if (diff > 0)
        return {
          value: `+${formatPower(diff)}`,
          unit: "",
          caption: `solar surplus ${when}`,
          color: AMBER,
        };
      return {
        value: `−${formatPower(-diff)}`,
        unit: "",
        caption: drawn,
        color: BLUE,
      };
    }
    // Difference of the rounded values the bars display, so the header adds up.
    const pr = Math.round(p * 10) / 10;
    const cr = Math.round(c * 10) / 10;
    const diff = Math.round((pr - cr) * 10) / 10;
    if (Math.abs(diff) < 0.05) return { value: "Balanced", unit: "", caption: when, color: "" };
    if (diff > 0)
      return {
        value: `+${diff.toFixed(1)}`,
        unit: "kWh",
        caption: `solar surplus ${when}`,
        color: AMBER,
      };
    return {
      value: `−${Math.abs(diff).toFixed(1)}`,
      unit: "kWh",
      caption: drawn,
      color: BLUE,
    };
  });

  const headIcon = () => (hasSolar() ? "mdi:solar-power-variant" : "mdi:transmission-tower");
  const eyebrow = () => {
    const c = readout().caption;
    return `${c.charAt(0).toUpperCase()}${c.slice(1)}`;
  };
  const subLine = () => {
    const unit = dataUnit();
    const fmt = (v: number) =>
      unit === "W" ? formatPower(v) : `${(Math.round(v * 10) / 10).toFixed(1)} kWh`;
    return hasSolar() ? `Solar ${fmt(produced())} · Home ${fmt(consumed())}` : undefined;
  };

  const daylight = useDaylight();
  const cycleMode = () => setMode((m) => MODES[(MODES.indexOf(m) + 1) % MODES.length]);
  const gestures = useWidgetGestures(() => ({ tap: cycleMode, hold: { action: openDialog } }));
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
          <Tile
            backdrop
            active={readout().color === AMBER}
            class={skyScene(daylight().phase) === "day" ? undefined : "dark"}
          >
            <TileBackdrop>
              <SkyScene glow={Math.min(1, liveSolarW() / 4000)} />
            </TileBackdrop>
            <TileGlyph icon={headIcon()} />
            <TileHead
              icon={headIcon()}
              eyebrow={eyebrow()}
              name={props.config.title || "Energy balance"}
              active={readout().color === AMBER}
            />
            <TileHero
              value={readout().value}
              unit={readout().unit ? ` ${readout().unit}` : undefined}
              sub={subLine()}
            />
            <TileControls>
              <ToggleGroup
                aria-label="Period"
                value={mode()}
                onChange={(v: string | null) => v && setMode(v as Mode)}
                class={`balance-modes ${TILE_INNER_RADIUS}`}
              >
                <For each={MODES}>
                  {(m) => (
                    <ToggleGroupItem value={m} class="balance-mode">
                      {MODE_LABEL[m]}
                    </ToggleGroupItem>
                  )}
                </For>
              </ToggleGroup>
            </TileControls>
          </Tile>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Energy Balance"
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
  manifest: {
    name: "Energy Balance",
    description: "Today's self-sufficiency: how much of your home ran on solar vs the grid",
    icon: "mdi:solar-power",
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 3 },
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
    ],
  },
  configSchema,
  component: EnergyBalanceWidget,
});
