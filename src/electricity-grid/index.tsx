import {
  defineWidget,
  useEntities,
  useReducedMotion,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { createMemo, type JSX, onCleanup, Show } from "solid-js";
import { EnergyEmptyState } from "../_energy-shared";
import { widgetDialogProps } from "../common";
import { Tile, TileChip, TileControls, TileGlyph, TileHead, TileHero } from "../common/tile/tile";
import { configSchema, type ElectricityGridConfig } from "./config";
import { outlook } from "./outlook";
import { ElectricityGridPanel } from "./panel";
import { PylonArt } from "./pylon-art";
import "./grid.css";
import { type Band, deriveVerdict, type Verdict } from "./verdict";

const TINT: Record<Band, string> = {
  clean: "var(--success)",
  mixed: "var(--muted-foreground)",
  dirty: "var(--warning)",
};

function firstId(ids: string[] | undefined): string {
  return ids?.[0] ?? "";
}

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(value < 10 ? 2 : 1);
}

interface BodyProps {
  title: string;
  verdict: Verdict;
  co2: number | null;
  price: number | null;
  priceUnit: string;
  showPrice: boolean;
}

function GridBody(props: BodyProps): JSX.Element {
  const tint = () => TINT[props.verdict.band];
  const note = () => props.verdict.priceNote;
  return (
    <Tile
      active={props.verdict.band === "clean"}
      accent={tint()}
      class={
        props.verdict.phrase.split(" ").length === 2 ? "grid-tile grid-two-words" : "grid-tile"
      }
    >
      <TileGlyph icon="mdi:transmission-tower" />
      <TileHead
        icon="mdi:transmission-tower"
        eyebrow={
          note() ? `${note().charAt(0).toUpperCase()}${note().slice(1)}` : "Electricity grid"
        }
        name={props.title}
        active={props.verdict.band === "clean"}
      />
      <TileHero
        value={props.verdict.phrase}
        sub={`${Math.round(props.verdict.lowCarbonPct)}% low-carbon`}
        art={<PylonArt lowCarbonPct={props.verdict.lowCarbonPct} tint={tint()} />}
      />
      <TileControls>
        <div class="grid-chips">
          <Show when={props.co2 !== null}>
            <TileChip icon="mdi:molecule-co2">{fmt(props.co2 ?? 0)} g/kWh</TileChip>
          </Show>
          <Show when={props.showPrice && props.price !== null}>
            <TileChip icon="mdi:cash">
              {fmt(props.price ?? 0)}
              {props.priceUnit ? ` ${props.priceUnit}` : ""}
            </TileChip>
          </Show>
        </div>
      </TileControls>
    </Tile>
  );
}

function ElectricityGridWidget(props: { config: ElectricityGridConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();
  const _reducedMotion = useReducedMotion();

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
  const priceUnit = () => entities().find((e) => e.id === priceId())?.unitOfMeasurement ?? "";

  const verdict = createMemo<Verdict | null>(() =>
    deriveVerdict({
      fossilPct: fossilPct(),
      price: price(),
      cheapBelow: props.config.cheapBelow ?? null,
    }),
  );

  const priceAttributes = () => entities().find((e) => e.id === priceId())?.attributes ?? {};
  const ahead = createMemo(() => outlook(priceAttributes(), new Date()));

  const configured = () => co2Id().length > 0 && fossilId().length > 0;

  const gestures = useWidgetGestures(() => ({ hold: { action: openDialog } }));
  onCleanup(gestures.dispose);

  return (
    <>
      <Widget gestures={gestures} variant="classic-glass" color="var(--tone-info)">
        <Show
          when={configured()}
          fallback={
            <Widget.Content>
              <EnergyEmptyState kind="unconfigured" onConfigure={openDialog} />
            </Widget.Content>
          }
        >
          <Show
            when={verdict()}
            fallback={
              <Widget.Content>
                <EnergyEmptyState kind="unavailable" lastKnownValue="Grid data" />
              </Widget.Content>
            }
          >
            {(v) => (
              <GridBody
                title={props.config.title || "Electricity grid"}
                verdict={v()}
                co2={co2()}
                price={price()}
                priceUnit={priceUnit()}
                showPrice={priceId().length > 0}
              />
            )}
          </Show>
        </Show>
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
        panel={
          <Show when={configured() && verdict()}>
            {(v) => (
              <ElectricityGridPanel
                name={props.config.title || "Electricity grid"}
                verdict={v()}
                tint={TINT[v().band]}
                co2={co2()}
                price={price()}
                priceUnit={priceUnit()}
                showPrice={priceId().length > 0}
                outlook={ahead()}
                format={fmt}
              />
            )}
          </Show>
        }
      />
    </>
  );
}

export default defineWidget<ElectricityGridConfig>({
  manifest: {
    name: "Electricity Grid",
    description: "Is now a good time to use power? Grid carbon intensity and price at a glance",
    icon: "mdi:transmission-tower",
    minSize: { w: 2, h: 1 },
    maxSize: { w: 8, h: 8 },
    defaultSize: { w: 2, h: 2 },
    capabilities: [{ domain: "sensor", access: "read" }],
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Full view",
        size: { w: 3, h: 3 },
        config: {
          title: "Electricity Grid",
          co2IntensityEntity: ["sensor.electricity_maps_co2_intensity"],
          fossilFuelEntity: ["sensor.electricity_maps_fossil_fuel_percentage"],
          priceEntity: ["sensor.nordpool_current_price"],
          cheapBelow: 0.2,
        },
      },
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
      {
        label: "Okay time, pricey",
        size: { w: 2, h: 2 },
        config: {
          title: "Electricity Grid",
          co2IntensityEntity: ["sensor.electricity_maps_co2_intensity_de"],
          fossilFuelEntity: ["sensor.electricity_maps_fossil_fuel_percentage_de"],
          priceEntity: ["sensor.nordpool_current_price"],
          cheapBelow: 0.15,
        },
      },
      {
        label: "Wait if you can",
        size: { w: 3, h: 3 },
        config: {
          title: "Electricity Grid",
          co2IntensityEntity: ["sensor.electricity_maps_co2_intensity_pl"],
          fossilFuelEntity: ["sensor.electricity_maps_fossil_fuel_percentage_pl"],
          priceEntity: ["sensor.nordpool_current_price"],
          cheapBelow: 0.2,
        },
      },
    ],
  },
  configSchema,
  component: ElectricityGridWidget,
});
