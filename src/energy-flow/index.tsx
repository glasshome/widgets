import {
  defineWidget,
  useEntities,
  useEntity,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { createMemo, onCleanup, Show } from "solid-js";
import { describeFlow, EnergyEmptyState, energyColors } from "../_energy-shared";
import { widgetDialogProps } from "../common";
import { configSchema, type EnergyFlowConfig } from "./config";
import { EnergyContent } from "./energy-content";
import {
  ACTIVE_THRESHOLD,
  deriveFlow,
  type EnergyFlow,
  isUnconfigured,
  type PowerLookup,
} from "./flow";
import { EnergyHeader } from "./header";

/** Scale a power reading to watts based on the sensor's reported unit.
 *  HA power sensors commonly report kW. "MW" and "mW" collide under a
 *  case-insensitive compare, so the megawatt/milliwatt branches stay exact-case;
 *  unknown/missing units are treated as W. */
function toWatts(value: number, unit: string | null | undefined): number {
  if (!unit) return value;
  if (unit === "MW") return value * 1e6;
  if (unit === "mW") return value / 1000;
  switch (unit.toLowerCase()) {
    case "kw":
      return value * 1000;
    case "mw":
      return value * 1e6;
    default:
      return value;
  }
}

/** Dominant source color tints the widget shell channel. Picks the source
 *  (solar / battery discharge / grid import) carrying the most power; falls
 *  back to the neutral home color when nothing is meaningfully flowing. */
function dominantColor(flow: EnergyFlow): string {
  const candidates: { watts: number; color: string }[] = [];
  if (flow.solar.watts > ACTIVE_THRESHOLD)
    candidates.push({ watts: flow.solar.watts, color: energyColors.solar });
  if (flow.battery.direction === "discharge" && flow.battery.watts > ACTIVE_THRESHOLD)
    candidates.push({ watts: flow.battery.watts, color: energyColors.battery });
  if (flow.grid.direction === "import" && flow.grid.watts > ACTIVE_THRESHOLD)
    candidates.push({ watts: flow.grid.watts, color: energyColors.grid });
  const top = candidates.sort((a, b) => b.watts - a.watts)[0];
  return top ? top.color : energyColors.home;
}

/** Collect every entity ID referenced by the config (single-select + arrays). */
function configEntityIds(config: EnergyFlowConfig): string[] {
  const single = [
    config.solarEntity,
    config.gridImportEntity,
    config.gridExportEntity,
    config.gridSignedEntity,
    config.batteryChargeEntity,
    config.batteryDischargeEntity,
    config.batterySignedEntity,
    config.batterySocEntity,
    config.homeEntity,
    config.evEntity,
    config.evSocEntity,
  ].flat();
  return [...single, ...config.consumerEntities].filter((id) => id.length > 0);
}

function EnergyFlowWidget(props: { config: EnergyFlowConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

  const ids = createMemo(() => configEntityIds(props.config));
  const entities = useEntities(ids);

  // Sun entity drives the night-resting solar state.
  const sunId = createMemo(() => props.config.sunEntity[0] ?? "");
  const sun = useEntity(sunId);
  const sunBelowHorizon = createMemo(() => sun()?.state === "below_horizon");

  const lookup = createMemo<PowerLookup>(() => {
    const map = new Map<string, number | null>();
    for (const e of entities()) {
      if (e.state === "unavailable" || e.state === "unknown") {
        map.set(e.id, null);
        continue;
      }
      const n = Number(e.state);
      map.set(e.id, Number.isFinite(n) ? toWatts(n, e.unitOfMeasurement) : null);
    }
    return (id: string) => (map.has(id) ? (map.get(id) ?? null) : null);
  });

  const flow = createMemo(() => deriveFlow(props.config, lookup(), sunBelowHorizon()));
  const description = createMemo(() => describeFlow(flow().flowState));
  const channelColor = createMemo(() => dominantColor(flow()));
  const unconfigured = createMemo(() => isUnconfigured(flow()));

  // Every configured node has a null reading → whole widget is unavailable.
  const allStale = createMemo(() => {
    const f = flow();
    const nodes = [f.solar, f.grid, f.battery, f.home, f.ev].filter((n) => n.configured);
    return nodes.length > 0 && nodes.every((n) => n.stale);
  });

  const gestures = useWidgetGestures(() => ({ hold: { action: openDialog } }));
  onCleanup(gestures.dispose);

  return (
    <>
      <Widget gestures={gestures} variant="classic-glass" color={channelColor()}>
        <Widget.Content>
          <Show
            when={!unconfigured()}
            fallback={
              <div class="flex h-full min-h-0 flex-col gap-2">
                <EnergyHeader headline={props.config.title || "Energy Flow"} dimmed />
                <div class="min-h-0 flex-1">
                  <EnergyEmptyState kind="unconfigured" onConfigure={openDialog} />
                </div>
              </div>
            }
          >
            <Show
              when={!allStale()}
              fallback={
                <div class="flex h-full min-h-0 flex-col gap-2">
                  <EnergyHeader headline={props.config.title || "Energy Flow"} dimmed />
                  <div class="min-h-0 flex-1">
                    <EnergyEmptyState kind="unavailable" />
                  </div>
                </div>
              }
            >
              <EnergyContent
                flow={flow()}
                description={description()}
                tariff={{ currency: props.config.tariffCurrency, rate: props.config.tariffRate }}
                title={props.config.title || "Energy Flow"}
              />
            </Show>
          </Show>
        </Widget.Content>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Energy Flow"
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

export default defineWidget<EnergyFlowConfig>({
  manifest: {
    name: "Energy Flow",
    description: "Live power flow between solar, grid, battery, home, and EV",
    icon: "mdi:lightning-bolt",
    minSize: { w: 2, h: 3 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^1.0.0",
    // v2: solarEntity went single-select -> multi (sum several arrays/inverters).
    // Single-select already stored as string[], so v1 configs (["sensor.x"]) are
    // valid as-is; Zod re-validates on load and no transform function is needed.
    configVersion: 2,
    examples: [
      {
        label: "Solar, battery and EV",
        size: { w: 4, h: 4 },
        config: {
          title: "Energy",
          solarEntity: ["sensor.solar_power"],
          gridImportEntity: ["sensor.grid_import_power"],
          gridExportEntity: ["sensor.grid_export_power"],
          gridSignedEntity: [],
          batteryChargeEntity: ["sensor.battery_charge_power"],
          batteryDischargeEntity: ["sensor.battery_discharge_power"],
          batterySignedEntity: [],
          batterySocEntity: ["sensor.battery_soc"],
          homeStrategy: "entity",
          homeEntity: ["sensor.home_power"],
          consumerEntities: [],
          evEntity: ["sensor.ev_charger_power"],
          evSocEntity: [],
          sunEntity: ["sun.sun"],
        },
      },
      {
        label: "Solar and grid",
        size: { w: 3, h: 3 },
        config: {
          title: "Solar",
          solarEntity: ["sensor.solar_power"],
          gridImportEntity: ["sensor.grid_import_power"],
          gridExportEntity: ["sensor.grid_export_power"],
          gridSignedEntity: [],
          batteryChargeEntity: [],
          batteryDischargeEntity: [],
          batterySignedEntity: [],
          batterySocEntity: [],
          homeStrategy: "grid_plus_solar",
          homeEntity: [],
          consumerEntities: [],
          evEntity: [],
          evSocEntity: [],
          sunEntity: ["sun.sun"],
        },
      },
      {
        label: "Grid only",
        size: { w: 2, h: 3 },
        config: {
          title: "Power",
          solarEntity: [],
          gridImportEntity: ["sensor.grid_import_power"],
          gridExportEntity: [],
          gridSignedEntity: [],
          batteryChargeEntity: [],
          batteryDischargeEntity: [],
          batterySignedEntity: [],
          batterySocEntity: [],
          homeStrategy: "entity",
          homeEntity: ["sensor.home_power"],
          consumerEntities: [],
          evEntity: [],
          evSocEntity: [],
          sunEntity: [],
        },
      },
    ],
  },
  configSchema,
  component: EnergyFlowWidget,
});
