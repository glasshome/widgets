import {
  defineWidget,
  useEntities,
  useReducedMotion,
  useWidgetContext,
  useWidgetDialog,
  useWidgetDimensions,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, type JSX, onCleanup, Show } from "solid-js";
import { EnergyEmptyState } from "../_energy-shared";
import { widgetDialogProps } from "../common";
import { configSchema, type ElectricityGridConfig } from "./config";
import { ArcGauge, BandMeter } from "./meters";
import { type Band, deriveVerdict, type Verdict } from "./verdict";

// Below these measured heights the gauge, then the meter and numbers, drop out.
const MEDIUM_HEIGHT = 130;
const LARGE_HEIGHT = 240;

const TINT: Record<Band, string> = {
  clean: "var(--success)",
  mixed: "var(--muted-foreground)",
  dirty: "var(--warning)",
};
const GLYPH: Record<Band, string> = {
  clean: "mdi:leaf",
  mixed: "mdi:approximately-equal",
  dirty: "mdi:factory",
};

function firstId(ids: string[] | undefined): string {
  return ids?.[0] ?? "";
}

interface BodyProps {
  title: string;
  verdict: Verdict;
  co2: number | null;
  fossilPct: number | null;
  price: number | null;
  showPrice: boolean;
  reducedMotion: boolean;
}

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(value < 10 ? 2 : 1);
}

// Rendered inside <Widget>: useWidgetDimensions throws in the top-level
// widget scope, which never sees real measurements.
function GridBody(props: BodyProps): JSX.Element {
  const dimensions = useWidgetDimensions();
  const tint = () => TINT[props.verdict.band];
  const showMeter = () => dimensions().height >= MEDIUM_HEIGHT;
  const showGauge = () => dimensions().height >= LARGE_HEIGHT;
  return (
    <div class="flex h-full min-h-0 flex-col gap-2">
      <div class="flex min-w-0 shrink-0 items-center gap-3">
        <Widget.Icon icon={<Icon icon="mdi:transmission-tower" />} />
        <div class="flex min-w-0 flex-col overflow-hidden">
          <Widget.Title>{props.title}</Widget.Title>
          <span class="truncate text-sm leading-snug">
            <span class="inline-flex items-center gap-1 font-medium" style={{ color: tint() }}>
              <Icon icon={GLYPH[props.verdict.band]} style={{ "font-size": "14px" }} />
              {props.verdict.phrase}
            </span>
            <Show when={props.verdict.priceNote}>
              <span class="text-foreground/50"> · {props.verdict.priceNote}</span>
            </Show>
          </span>
        </div>
      </div>
      <Show when={showGauge()}>
        <div class="min-h-0 flex-1">
          <ArcGauge
            lowCarbonPct={props.verdict.lowCarbonPct}
            tint={tint()}
            label="low-carbon"
            reducedMotion={props.reducedMotion}
          />
        </div>
      </Show>
      <Show when={showMeter()}>
        <div class="flex shrink-0 flex-col gap-1.5 px-1">
          <BandMeter
            lowCarbonPct={props.verdict.lowCarbonPct}
            tint={tint()}
            reducedMotion={props.reducedMotion}
          />
          <div class="flex justify-between text-muted-foreground text-xs tabular-nums">
            <Show when={props.co2 !== null}>
              <span>{fmt(props.co2 ?? 0)} g/kWh</span>
            </Show>
            <Show when={props.fossilPct !== null}>
              <span>{fmt(props.fossilPct ?? 0)}% fossil</span>
            </Show>
            <Show when={props.showPrice && props.price !== null}>
              <span>{fmt(props.price ?? 0)}</span>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}

function ElectricityGridWidget(props: { config: ElectricityGridConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();
  const reducedMotion = useReducedMotion();

  const co2Id = () => firstId(props.config.co2IntensityEntity);
  const fossilId = () => firstId(props.config.fossilFuelEntity);
  const priceId = () => firstId(props.config.priceEntity);
  const ids = createMemo(() => [co2Id(), fossilId(), priceId()].filter((id) => id.length > 0));
  const entities = useEntities(ids);
  const numeric = (id: string): number | null => {
    if (!id) return null;
    const entity = entities().find((e) => e.id === id);
    if (!entity) return null;
    const n = Number(entity.state);
    return Number.isFinite(n) ? n : null;
  };

  const co2 = () => numeric(co2Id());
  const fossilPct = () => numeric(fossilId());
  const price = () => numeric(priceId());

  const verdict = createMemo<Verdict | null>(() =>
    deriveVerdict({
      fossilPct: fossilPct(),
      price: price(),
      cheapBelow: props.config.cheapBelow ?? null,
    }),
  );

  const configured = () => co2Id().length > 0 && fossilId().length > 0;

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
            <Show
              when={verdict()}
              fallback={<EnergyEmptyState kind="unavailable" lastKnownValue="Grid data" />}
            >
              {(v) => (
                <GridBody
                  title={props.config.title || "Electricity Grid"}
                  verdict={v()}
                  co2={co2()}
                  fossilPct={fossilPct()}
                  price={price()}
                  showPrice={priceId().length > 0}
                  reducedMotion={reducedMotion()}
                />
              )}
            </Show>
          </Show>
        </Widget.Content>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Electricity Grid"
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

export default defineWidget<ElectricityGridConfig>({
  manifest: {
    name: "Electricity Grid",
    description: "Is now a good time to use power? Grid carbon intensity and price at a glance",
    icon: "mdi:transmission-tower",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 3, h: 3 },
    defaultSize: { w: 2, h: 2 },
    capabilities: [{ domain: "sensor", access: "read" }],
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Carbon and price",
        size: { w: 2, h: 2 },
        config: {
          title: "Electricity Grid",
          co2IntensityEntity: ["sensor.electricity_maps_co2_intensity"],
          fossilFuelEntity: ["sensor.electricity_maps_fossil_fuel_percentage"],
          priceEntity: ["sensor.nordpool_current_price"],
          cheapBelow: 0.2,
        },
      },
      {
        label: "Carbon only",
        size: { w: 2, h: 1 },
        config: {
          title: "Electricity Grid",
          co2IntensityEntity: ["sensor.electricity_maps_co2_intensity"],
          fossilFuelEntity: ["sensor.electricity_maps_fossil_fuel_percentage"],
          priceEntity: [],
        },
      },
    ],
  },
  configSchema,
  component: ElectricityGridWidget,
});
