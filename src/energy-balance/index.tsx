import {
  defineWidget,
  useEntities,
  useEntityStatistics,
  useReducedMotion,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  svgColors,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Badge } from "@glasshome/ui/solid";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, type JSX, onCleanup, onMount, Show } from "solid-js";
import { EnergyEmptyState, formatPower, normalizeBidirectional } from "../_energy-shared";
import { widgetDialogProps } from "../common";
import { deriveBalance } from "./balance";
import { configSchema, type EnergyBalanceConfig } from "./config";
import { BalanceBar, EnergyColumns, type ValueUnit } from "./ring";

const STATS_REFRESH_MS = 5 * 60 * 1000;
// Below this measured height the produced-vs-used bars can't breathe, so the
// compact single balance bar shows instead.
const COMPACT_HEIGHT = 210;
const AMBER = svgColors.solar.solid;
const BLUE = svgColors.grid.solid;

type Mode = "live" | "today" | "week" | "month";
const MODES: Mode[] = ["today", "live", "week", "month"];
const MODE_LABEL: Record<Mode, string> = { live: "Now", today: "Today", week: "Week", month: "Month" };
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

interface BodyProps {
  title: string;
  value: string;
  unit: string;
  caption: string;
  color: string;
  modeLabel: string;
  dataUnit: ValueUnit;
  produced: number;
  consumed: number;
  balance: number;
  reducedMotion: boolean;
}

// Rendered inside <Widget>, so useWidgetContext here sees real measured
// dimensions (the top-level scope only has the sm stub).
function BalanceBody(props: BodyProps): JSX.Element {
  const ctx = useWidgetContext();
  const compact = () => ctx.dimensions().height < COMPACT_HEIGHT;
  return (
    <div class="relative flex h-full min-h-0 flex-col gap-2">
      <Badge variant="secondary" class="absolute top-0 right-0 z-10">
        {props.modeLabel}
      </Badge>
      <div class="flex min-w-0 shrink-0 items-center gap-3">
        <Widget.Icon icon={<Icon icon="mdi:scale-balance" />} />
        <div class="flex min-w-0 flex-col overflow-hidden">
          <Widget.Title>{props.title}</Widget.Title>
          <span class="truncate text-sm leading-snug">
            <span class="font-semibold tabular-nums" style={{ color: props.color || undefined }}>
              {props.value}
              {props.unit ? ` ${props.unit}` : ""}
            </span>{" "}
            <span class="text-foreground/50">{props.caption}</span>
          </span>
        </div>
      </div>
      <div class="flex min-h-0 flex-1 flex-col justify-center px-1">
        <Show
          when={compact()}
          fallback={
            <EnergyColumns
              produced={props.produced}
              consumed={props.consumed}
              unit={props.dataUnit}
              reducedMotion={props.reducedMotion}
            />
          }
        >
          <BalanceBar
            produced={props.produced}
            consumed={props.consumed}
            unit={props.dataUnit}
            balance={props.balance}
            reducedMotion={props.reducedMotion}
          />
        </Show>
      </div>
    </div>
  );
}

function EnergyBalanceWidget(props: { config: EnergyBalanceConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();
  const reducedMotion = useReducedMotion();
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

  const configured = createMemo(() => {
    const hasStats =
      firstId(props.config.solarEnergyEntity).length > 0 &&
      (firstId(props.config.homeEnergyEntity).length > 0 ||
        firstId(props.config.gridImportEnergyEntity).length > 0);
    const hasLive =
      firstId(props.config.solarPowerEntity).length > 0 &&
      firstId(props.config.homePowerEntity).length > 0;
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

  // -1 draws entirely from the grid, 0 matches, +1 all surplus.
  const dayBalance = createMemo(() => {
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
    if (dataUnit() === "W") {
      const diff = p - c;
      if (Math.abs(diff) < 50) return { value: "Balanced", unit: "", caption: when, color: "" };
      if (diff > 0)
        return { value: `+${formatPower(diff)}`, unit: "", caption: `solar surplus ${when}`, color: AMBER };
      return { value: `−${formatPower(-diff)}`, unit: "", caption: `grid top-up ${when}`, color: BLUE };
    }
    // Difference of the rounded values the bars display, so the header adds up.
    const pr = Math.round(p * 10) / 10;
    const cr = Math.round(c * 10) / 10;
    const diff = Math.round((pr - cr) * 10) / 10;
    if (Math.abs(diff) < 0.05) return { value: "Balanced", unit: "", caption: when, color: "" };
    if (diff > 0)
      return { value: `+${diff.toFixed(1)}`, unit: "kWh", caption: `solar surplus ${when}`, color: AMBER };
    return { value: `−${Math.abs(diff).toFixed(1)}`, unit: "kWh", caption: `grid top-up ${when}`, color: BLUE };
  });

  const cycleMode = () => setMode((m) => MODES[(MODES.indexOf(m) + 1) % MODES.length]);
  const gestures = useWidgetGestures(() => ({ tap: cycleMode, hold: { action: openDialog } }));
  onCleanup(gestures.dispose);

  return (
    <>
      <Widget gestures={gestures} variant="classic-glass" color="var(--tone-accent)">
        <Widget.Content>
          <Show
            when={configured()}
            fallback={<EnergyEmptyState kind="unconfigured" onConfigure={openDialog} />}
          >
            <BalanceBody
              title={props.config.title || "Energy Balance"}
              value={readout().value}
              unit={readout().unit}
              caption={readout().caption}
              color={readout().color}
              modeLabel={MODE_LABEL[mode()]}
              dataUnit={dataUnit()}
              produced={produced()}
              consumed={consumed()}
              balance={dayBalance()}
              reducedMotion={reducedMotion()}
            />
          </Show>
        </Widget.Content>
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
  },
  configSchema,
  component: EnergyBalanceWidget,
});
