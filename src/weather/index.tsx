import {
  buildDebugData,
  defineConfig,
  defineWidget,
  field,
  getEntityAttribute,
  type Infer,
  useEntity,
  useForecast,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  type WidgetDebugData,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, onCleanup, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import { dayHigh, upcomingHours } from "./forecast";
import { type Detail, type Model, WeatherTile } from "./layout";
import { WeatherSheet } from "./sheet";
import {
  formatDegrees,
  formatTemp,
  formatWindSpeed,
  getConditionLabel,
  getWeatherIconColor,
} from "./utils";
import "./weather.css";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("weather"),
  showForecast: field.toggle({ title: "Show Forecast", default: true }),
});
type WeatherConfig = Infer<typeof configSchema>;

const MAX_DAYS = 10;
const SNOWY = new Set(["snowy", "snowy-rainy"]);

const UV_WORDS: [number, string][] = [
  [11, "Extreme"],
  [8, "Very high"],
  [6, "High"],
  [3, "Moderate"],
  [0, "Low"],
];

function WeatherWidget(props: { config: WeatherConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

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

  const details = (): Detail[] => {
    const out: Detail[] = [];
    const feels = attr<number>("apparent_temperature");
    if (feels != null) {
      out.push({ icon: "mdi:thermometer", label: "Feels like", value: formatTemp(feels) });
    }
    const wind = attr<number>("wind_speed");
    if (wind != null) {
      const bearing = attr<number>("wind_bearing");
      out.push({
        icon: bearing != null ? "mdi:navigation" : "mdi:weather-windy",
        label: "Wind",
        value: formatWindSpeed(wind, attr<string>("wind_speed_unit") ?? undefined),
        rotate: bearing != null ? bearing + 180 : undefined,
      });
    }
    const humidity = attr<number>("humidity");
    if (humidity != null) {
      out.push({ icon: "mdi:water-percent", label: "Humidity", value: `${Math.round(humidity)}%` });
    }
    const uv = attr<number>("uv_index");
    if (uv != null) {
      const word = UV_WORDS.find(([min]) => uv >= min)?.[1] ?? "";
      out.push({
        icon: "mdi:sun-wireless-outline",
        label: "UV index",
        value: `${Math.round(uv)} ${word}`,
      });
    }
    const pressure = attr<number>("pressure");
    if (pressure != null) {
      const unit = attr<string>("pressure_unit") ?? "hPa";
      out.push({ icon: "mdi:gauge", label: "Pressure", value: `${Math.round(pressure)} ${unit}` });
    }
    const visibility = attr<number>("visibility");
    if (visibility != null) {
      const unit = attr<string>("visibility_unit") ?? "km";
      out.push({
        icon: "mdi:eye-outline",
        label: "Visibility",
        value: `${Math.round(visibility)} ${unit}`,
      });
    }
    return out;
  };

  const model = createMemo((): Model => {
    const today = days()[0];
    const high = today ? dayHigh(today) : undefined;
    const low = today?.temp_low;
    const range = high != null && low != null ? ` · ${formatTemp(high)} / ${formatTemp(low)}` : "";
    const t = attr<number>("temperature");
    const freezing = attr<string>("temperature_unit") === "°F" ? 32 : 0;
    return {
      title: props.config.title || undefined,
      condition: condition(),
      wintry: SNOWY.has(condition()) || (t != null && t <= freezing),
      temperature: t != null ? formatDegrees(t) : "--",
      sub: `${getConditionLabel(condition())}${range}`,
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

  const gestures = useWidgetGestures(() => ({
    hold: extras() ? { action: openDialog } : undefined,
  }));
  onCleanup(gestures.dispose);

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
        gestures={gestures}
        variant="classic-glass"
        color={getWeatherIconColor(condition())}
        emptyState={
          !entity()
            ? {
                icon: <Icon icon="mdi:weather-partly-cloudy" width={32} />,
                title: "No weather entity",
                message: "Hold to configure",
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
        title={props.config.title || "Weather"}
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
              sheet: <WeatherSheet hours={sheetHours()} days={sheetDays()} details={details()} />,
            }
          : {})}
      />
    </>
  );
}

export default defineWidget<WeatherConfig>({
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
