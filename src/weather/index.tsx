import {
  buildDebugData,
  defineConfig,
  defineWidget,
  field,
  getEntityAttribute,
  Icon,
  type Infer,
  useEntity,
  useForecast,
  useTranslation,
  useWidgetContext,
  useWidgetDialog,
  Widget,
  type WidgetDebugData,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { createMemo, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import { dayHigh, upcomingHours } from "./forecast";
import { weatherDetails } from "./details";
import { type Detail, type Model, WeatherTile } from "./layout";
import { WeatherSheet } from "./sheet";
import { scenePhotos } from "./sky";
import {
  formatDegrees,
  formatTemp,
  getConditionLabel,
  getWeatherIcon,
  getWeatherIconColor,
} from "./utils";
import "./weather.css";
import en from "./locales/en.json";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("weather"),
  showForecast: field.toggle({ title: "Show Forecast", default: true }),
});
type WeatherConfig = Infer<typeof configSchema>;

const MAX_DAYS = 10;

const SNOWY = new Set(["snowy", "snowy-rainy"]);

function WeatherWidget(props: { config: WeatherConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, dialogProps } = useWidgetDialog();
  const tools = useTranslation();

  const entityId = () => props.config.entityIds[0] ?? "";
  const entity = useEntity(entityId);
  const forecast = useForecast(entityId, ["hourly", "daily"]);

  const attr = <T,>(key: string) => {
    const e = entity();
    return e ? getEntityAttribute<T>(e, key) : undefined;
  };
  const condition = createMemo(() => entity()?.state ?? "cloudy");
  const hours = createMemo(() =>
    props.config.showForecast === false
      ? []
      : upcomingHours(forecast()?.forecasts?.hourly ?? [], new Date()),
  );
  const days = createMemo(() =>
    props.config.showForecast === false
      ? []
      : (forecast()?.forecasts?.daily?.slice(0, MAX_DAYS) ?? []),
  );

  const details = (): Detail[] => weatherDetails(tools, attr);

  const model = createMemo((): Model => {
    const today = days()[0];
    const high = today ? dayHigh(today) : undefined;
    const low = today?.temp_low;
    const label = getConditionLabel(tools, condition());
    const t = attr<number>("temperature");
    const freezing = attr<string>("temperature_unit") === "°F" ? 32 : 0;
    return {
      title: props.config.title || undefined,
      condition: condition(),
      wintry: SNOWY.has(condition()) || (t != null && t <= freezing),
      temperature: t != null ? formatDegrees(tools, t) : "--",
      sub:
        high != null && low != null
          ? tools.t("weather.sub-range", {
              condition: label,
              high: formatTemp(tools, high),
              low: formatTemp(tools, low),
            })
          : label,
      hours: hours(),
      days: days(),
      details: details(),
    };
  });

  const sheetHours = createMemo(() =>
    upcomingHours(forecast()?.forecasts?.hourly ?? [], new Date()),
  );
  const sheetDays = createMemo(() => forecast()?.forecasts?.daily ?? []);
  const extras = () =>
    !!entity() && (sheetHours().length > 1 || sheetDays().length > 0 || details().length > 0);

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const e = entity();
    if (!e) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, [e], {
      forecast: forecast(),
    });
  });

  return (
    <>
      <Widget
        variant="classic-glass"
        color={getWeatherIconColor(condition())}
        emptyState={
          !entity()
            ? {
                icon: <Icon icon="mdi:weather-partly-cloudy" width={32} />,
                title: tools.t("weather.empty.title"),
                message: tools.t("weather.empty.message"),
              }
            : undefined
        }
      >
        <Show when={entity()}>
          <WeatherTile model={model()} />
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title={props.config.title || tools.t("weather.title")}
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        debugData={debugData()}
        {...(extras()
          ? {
              sheet: () => (
                <WeatherSheet hours={sheetHours()} days={sheetDays()} details={details()} />
              ),
            }
          : {})}
        tile={{
          icon: getWeatherIcon(condition()),
          tone: getWeatherIconColor(condition()),
          backdrop: scenePhotos(condition(), false, false).sky,
        }}
      />
    </>
  );
}

export default defineWidget<WeatherConfig>({
  messages: en,
  manifest: {
    name: "Weather",
    description: "The sky outside, the hours and days ahead",
    icon: "mdi:weather-partly-cloudy",
    minSize: { w: 2, h: 1 },
    maxSize: { w: 12, h: 8 },
    defaultSize: { w: 4, h: 3 },
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Partly cloudy",
        size: { w: 4, h: 3 },
        config: { entityIds: ["weather.demo_partly_cloudy"], showForecast: true },
      },
      {
        label: "Centerpiece",
        size: { w: 8, h: 5 },
        config: { entityIds: ["weather.demo_rainy"], showForecast: true },
      },
      {
        label: "Snow",
        size: { w: 4, h: 4 },
        config: { entityIds: ["weather.demo_snowy"], showForecast: true },
      },
      {
        label: "Strip",
        size: { w: 6, h: 1 },
        config: { entityIds: ["weather.demo_sunny"], showForecast: true },
      },
    ],
  },
  configSchema,
  component: WeatherWidget,
});
