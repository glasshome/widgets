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
import { describeFlow, EnergyEmptyState } from "../_energy-shared";
import { widgetDialogProps } from "../common";
import { configSchema, type EnergyFlowConfig } from "./config";
import { EnergyContent } from "./energy-content";
import { allStale, isUnconfigured } from "./flow";
import { configEntityIds, dominantColor, type PowerLookup, resolveFlow } from "./graph-adapter";
import { EnergyHeader } from "./header";
import { migrateConfig } from "./migrate";

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

function EnergyFlowWidget(props: { config: EnergyFlowConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

  const ids = createMemo(() => configEntityIds(props.config.nodes));
  const entities = useEntities(ids);

  // Sun entity drives the night-resting state of input nodes.
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

  const flow = createMemo(() => resolveFlow(props.config.nodes, lookup(), sunBelowHorizon()));
  const description = createMemo(() => describeFlow(flow().flowState));
  const channelColor = createMemo(() => dominantColor(flow()));
  const unconfigured = createMemo(() => isUnconfigured(flow()));

  // Every sensor-backed node has a null reading → whole widget is unavailable.
  const stale = createMemo(() => allStale(flow()));

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
              when={!stale()}
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
    // v3: the fixed five-role fields became a user-defined node list
    // (field.list + field.variants); migrate.ts maps v1/v2 configs onto it.
    configVersion: 3,
    examples: [
      {
        label: "Solar, battery and EV",
        size: { w: 4, h: 4 },
        config: {
          title: "Energy",
          nodes: [
            {
              kind: "input",
              entities: ["sensor.solar_power"],
              label: "Solar",
              icon: "mdi:solar-power-variant",
              level: [],
            },
            {
              kind: "bidirectional",
              positive: ["sensor.battery_discharge_power"],
              negative: ["sensor.battery_charge_power"],
              signed: [],
              signedOutbound: false,
              priced: false,
              label: "Battery",
              icon: "mdi:battery-high",
              level: ["sensor.battery_soc"],
            },
            {
              kind: "bidirectional",
              positive: ["sensor.grid_import_power"],
              negative: ["sensor.grid_export_power"],
              signed: [],
              signedOutbound: false,
              priced: true,
              label: "Grid",
              icon: "mdi:transmission-tower",
              level: [],
            },
            {
              kind: "output",
              entities: [],
              remainder: true,
              label: "Home",
              icon: "mdi:home-lightning-bolt",
              level: [],
            },
            {
              kind: "output",
              entities: ["sensor.ev_charger_power"],
              remainder: false,
              label: "EV charging",
              icon: "mdi:car-electric",
              level: ["sensor.ev_soc"],
            },
          ],
          sunEntity: ["sun.sun"],
        },
      },
      {
        label: "Solar and grid",
        size: { w: 3, h: 3 },
        config: {
          title: "Solar",
          nodes: [
            {
              kind: "input",
              entities: ["sensor.solar_power"],
              label: "Solar",
              icon: "mdi:solar-power-variant",
              level: [],
            },
            {
              kind: "bidirectional",
              positive: ["sensor.grid_import_power"],
              negative: ["sensor.grid_export_power"],
              signed: [],
              signedOutbound: false,
              priced: true,
              label: "Grid",
              icon: "mdi:transmission-tower",
              level: [],
            },
            {
              kind: "output",
              entities: [],
              remainder: true,
              label: "Home",
              icon: "mdi:home-lightning-bolt",
              level: [],
            },
          ],
          sunEntity: ["sun.sun"],
        },
      },
      {
        label: "Solar and battery",
        size: { w: 2, h: 3 },
        config: {
          title: "Power",
          nodes: [
            {
              kind: "input",
              entities: ["sensor.solar_power"],
              label: "Solar",
              icon: "mdi:solar-power-variant",
              level: [],
            },
            {
              kind: "bidirectional",
              positive: ["sensor.battery_discharge_power"],
              negative: ["sensor.battery_charge_power"],
              signed: [],
              signedOutbound: false,
              priced: false,
              label: "Battery",
              icon: "mdi:battery-high",
              level: ["sensor.battery_soc"],
            },
            {
              kind: "output",
              entities: [],
              remainder: true,
              label: "Home",
              icon: "mdi:home-lightning-bolt",
              level: [],
            },
          ],
          sunEntity: ["sun.sun"],
        },
      },
    ],
  },
  configSchema,
  migrate: migrateConfig,
  component: EnergyFlowWidget,
});
