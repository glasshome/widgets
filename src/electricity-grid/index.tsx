import {
  defineWidget,
  useEntities,
  useReducedMotion,
  useWidgetContext,
  useWidgetDialog,
  useTranslation,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { createMemo, type JSX, Show } from "solid-js";
import { EnergyEmptyState } from "../_energy-shared";
import { widgetDialogProps } from "../common";
import { configSchema, type ElectricityGridConfig } from "./config";
import { PylonArt } from "./pylon-art";
import "./grid.css";
import { type Band, deriveVerdict, type Verdict } from "./verdict";
import { gridLines, gridNumber, gridTileClass } from "./words";
import en from "./locales/en.json";

const TINT: Record<Band, string> = {
  clean: "var(--success)",
  mixed: "var(--muted-foreground)",
  dirty: "var(--warning)",
};

function firstId(ids: string[] | undefined): string {
  return ids?.[0] ?? "";
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
  const tools = useTranslation();
  const lines = () => gridLines(tools, props.verdict, props.co2);
  const tint = () => TINT[props.verdict.band];
  return (
    <Widget.Content accent={tint()} class={gridTileClass(props.verdict.band)}>
      <Widget.Glyph icon="mdi:transmission-tower" />
      <Widget.Head
        icon="mdi:transmission-tower"
        eyebrow={lines().eyebrow}
        name={props.title}
        active={props.verdict.band === "clean"}
      />
      <Widget.Hero
        value={props.verdict.phrase}
        sub={lines().sub}
        art={<PylonArt lowCarbonPct={props.verdict.lowCarbonPct} tint={tint()} />}
      />
      <Widget.Controls>
        <div class="grid-chips">
          <Show when={lines().co2}>
            <Widget.Chip icon="mdi:molecule-co2">{lines().co2}</Widget.Chip>
          </Show>
          <Show when={props.showPrice && props.price !== null}>
            <Widget.Chip icon="mdi:cash">
              {gridNumber(tools, props.price ?? 0)}
              {props.priceUnit ? ` ${props.priceUnit}` : ""}
            </Widget.Chip>
          </Show>
        </div>
      </Widget.Controls>
    </Widget.Content>
  );
}

function ElectricityGridWidget(props: { config: ElectricityGridConfig }) {
  const ctx = useWidgetContext();
  const tools = useTranslation();
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
    deriveVerdict(
      {
        fossilPct: fossilPct(),
        price: price(),
        cheapBelow: props.config.cheapBelow ?? null,
      },
      tools,
    ),
  );

  const configured = () => co2Id().length > 0 && fossilId().length > 0;

  return (
    <>
      <Widget variant="classic-glass" color="var(--tone-info)">
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
                <EnergyEmptyState
                  kind="unavailable"
                  lastKnownValue={tools.t("electricity-grid.no-data")}
                />
              </Widget.Content>
            }
          >
            {(v) => (
              <GridBody
                title={props.config.title || tools.t("electricity-grid.title")}
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
        title={tools.t("electricity-grid.title")}
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
  messages: en,
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
