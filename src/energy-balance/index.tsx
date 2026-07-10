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
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, type JSX, onCleanup, onMount, Show } from "solid-js";
import { EnergyEmptyState, normalizeBidirectional } from "../_energy-shared";
import { widgetDialogProps } from "../common";
import { deriveBalance } from "./balance";
import { configSchema, type EnergyBalanceConfig } from "./config";
import { BalanceBar, EnergyColumns } from "./ring";

const STATS_REFRESH_MS = 5 * 60 * 1000;
// Below this measured height the produced-vs-used bars can't breathe, so the
// compact single balance bar shows instead.
const COMPACT_HEIGHT = 210;
const AMBER = svgColors.solar.solid;
const BLUE = svgColors.grid.solid;

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
  producedKWh: number;
  consumedKWh: number;
  balance: number;
  reducedMotion: boolean;
  tint: string;
}

// Rendered inside <Widget>, so useWidgetContext here sees real measured
// dimensions (the top-level scope only has the sm stub).
function BalanceBody(props: BodyProps): JSX.Element {
  const ctx = useWidgetContext();
  const compact = () => ctx.dimensions().height < COMPACT_HEIGHT;
  return (
    <div class="flex h-full min-h-0 flex-col gap-2" style={{ background: props.tint }}>
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
              producedKWh={props.producedKWh}
              consumedKWh={props.consumedKWh}
              reducedMotion={props.reducedMotion}
            />
          }
        >
          <BalanceBar balance={props.balance} reducedMotion={props.reducedMotion} />
        </Show>
      </div>
    </div>
  );
}

function EnergyBalanceWidget(props: { config: EnergyBalanceConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();
  const reducedMotion = useReducedMotion();

  // Bumping the tick hands useEntityStatistics a fresh options object, re-running the daily query.
  const [tick, setTick] = createSignal(0);
  onMount(() => {
    const iv = setInterval(() => setTick((t) => t + 1), STATS_REFRESH_MS);
    onCleanup(() => clearInterval(iv));
  });

  const dayOptions = createMemo(() => {
    tick();
    const start = new Date();
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
    ].filter((id) => id.length > 0),
  );
  const liveEntities = useEntities(livePowerIds);

  const netW = createMemo(() => {
    const map = new Map<string, number>();
    for (const e of liveEntities()) {
      const n = Number(e.state);
      if (Number.isFinite(n)) map.set(e.id, n);
    }
    const signedId = firstId(props.config.gridSignedPowerEntity);
    if (signedId && map.has(signedId)) {
      const n = normalizeBidirectional({ signed: map.get(signedId) ?? 0 });
      return n.import - n.export;
    }
    const importId = firstId(props.config.gridImportPowerEntity);
    const exportId = firstId(props.config.gridExportPowerEntity);
    const n = normalizeBidirectional({
      importValue: map.get(importId) ?? 0,
      exportValue: map.get(exportId) ?? 0,
    });
    return n.import - n.export;
  });

  const configured = createMemo(() => {
    const hasSolar = firstId(props.config.solarEnergyEntity).length > 0;
    const hasConsumption =
      firstId(props.config.homeEnergyEntity).length > 0 ||
      firstId(props.config.gridImportEnergyEntity).length > 0;
    return hasSolar && hasConsumption;
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

  // Daily balance: -1 draws entirely from grid, 0 matches, +1 all surplus.
  const dayBalance = createMemo(() => {
    const b = balance();
    const total = b.producedKWh + b.consumedKWh;
    if (total <= 0) return 0;
    return Math.max(-1, Math.min(1, (b.producedKWh - b.consumedKWh) / total));
  });
  const readout = createMemo(() => {
    const diff = balance().producedKWh - balance().consumedKWh;
    if (Math.abs(diff) < 0.3) return { value: "Balanced", unit: "", caption: "today", color: "" };
    if (diff > 0)
      return { value: `+${diff.toFixed(1)}`, unit: "kWh", caption: "solar surplus today", color: AMBER };
    return { value: `−${Math.abs(diff).toFixed(1)}`, unit: "kWh", caption: "grid top-up today", color: BLUE };
  });
  const cardTint = createMemo(() => {
    const s = balance().status;
    if (s === "export") return "color-mix(in oklch, var(--tone-success) 8%, transparent)";
    if (s === "import") return "color-mix(in oklch, var(--tone-info) 7%, transparent)";
    return "transparent";
  });

  const gestures = useWidgetGestures(() => ({ hold: { action: openDialog } }));
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
              producedKWh={balance().producedKWh}
              consumedKWh={balance().consumedKWh}
              balance={dayBalance()}
              reducedMotion={reducedMotion()}
              tint={cardTint()}
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
