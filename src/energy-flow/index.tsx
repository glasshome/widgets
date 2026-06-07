import {
  fetchEnergyPreferences,
  getConnection,
} from "@glasshome/sync-layer";
import { useEntities, useEntity } from "@glasshome/sync-layer/solid";
import {
  defineWidget,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import {
  describeFlow,
  energyColors,
  EnergyEmptyState,
  mapEnergyPreferences,
} from "../_energy-shared";
import { widgetDialogProps } from "../common";
import { configSchema, type EnergyFlowConfig } from "./config";
import { EnergyContent } from "./energy-content";
import { deriveFlow, type EnergyFlow, isUnconfigured, type PowerLookup } from "./flow";

const ACTIVE_THRESHOLD = 50;

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
      map.set(e.id, Number.isFinite(n) ? n : null);
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

  const [discovering, setDiscovering] = createSignal(false);
  const runDiscovery = () => {
    const conn = getConnection();
    if (!conn) return;
    setDiscovering(true);
    fetchEnergyPreferences(conn)
      .then((prefs) => {
        const discovered = mapEnergyPreferences(prefs);
        ctx.updateConfig({
          ...props.config,
          solarEntity: discovered.solar ? [discovered.solar] : props.config.solarEntity,
          gridImportEntity: discovered.gridImport
            ? [discovered.gridImport]
            : props.config.gridImportEntity,
          gridExportEntity: discovered.gridExport
            ? [discovered.gridExport]
            : props.config.gridExportEntity,
          batteryChargeEntity: discovered.batteryCharge
            ? [discovered.batteryCharge]
            : props.config.batteryChargeEntity,
          batteryDischargeEntity: discovered.batteryDischarge
            ? [discovered.batteryDischarge]
            : props.config.batteryDischargeEntity,
          consumerEntities:
            discovered.consumers.length > 0
              ? discovered.consumers.map((c) => c.statId)
              : props.config.consumerEntities,
        });
      })
      .finally(() => setDiscovering(false));
  };

  const gestures = useWidgetGestures(() => ({ hold: { action: openDialog } }));
  onCleanup(gestures.dispose);

  return (
    <>
      <Widget
        gestures={gestures}
        variant="classic-glass"
        color={channelColor()}
      >
        <Widget.Content>
          <Show
            when={!unconfigured()}
            fallback={
              <div class="flex h-full flex-col items-center justify-center gap-3 p-3 text-center">
                <EnergyEmptyState kind="unconfigured" onConfigure={openDialog} />
                <button
                  type="button"
                  class="flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-foreground/10 disabled:opacity-50"
                  disabled={discovering()}
                  on:pointerdown={(e: PointerEvent) => e.stopPropagation()}
                  on:click={runDiscovery}
                >
                  <Icon icon={discovering() ? "mdi:loading" : "mdi:home-lightning-bolt"} width={14} />
                  Use my Home Assistant energy settings
                </button>
              </div>
            }
          >
            <Show
              when={!allStale()}
              fallback={<EnergyEmptyState kind="unavailable" />}
            >
              <EnergyContent flow={flow()} description={description()} />
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
    sdkVersion: "^0.5.0",
  },
  configSchema,
  component: EnergyFlowWidget,
});
