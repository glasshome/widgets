import {
  defineConfig,
  defineWidget,
  field,
  getEntityAttribute,
  getForecasts,
  type Infer,
  useEntity,
  useForecast,
  useWidgetContext,
  useWidgetDialog,
  useWidgetDimensions,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, For, onCleanup, onMount, Show } from "solid-js";
import type { WidgetDebugData } from "../common";
import { buildDebugData, WidgetDebugView, widgetDialogProps } from "../common";
import { WeatherBackground } from "./background";
import { ForecastChart } from "./forecast-chart";
import {
  formatTemp,
  formatWindSpeed,
  getSceneGlyphShadowClass,
  getSceneInkClass,
  getWeatherIcon,
  getWeatherIconColor,
} from "./utils";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("weather"),
  showForecast: field.toggle({ title: "Show Forecast", default: true }),
});
type WeatherConfig = Infer<typeof configSchema>;

const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

function WeatherWidget(props: { config: WeatherConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

  const entityId = () => props.config.entityIds[0] ?? "";
  const entity = useEntity(entityId);
  const forecast = useForecast(entityId);

  const fetchForecastData = () => {
    const id = entityId();
    if (id) {
      getForecasts(id, ["hourly", "daily"]).catch(() => {});
    }
  };

  onMount(() => {
    fetchForecastData();
    const interval = setInterval(fetchForecastData, REFRESH_INTERVAL);
    onCleanup(() => clearInterval(interval));
  });

  const condition = createMemo(() => entity()?.state ?? "cloudy");
  const temperature = createMemo(() => {
    const e = entity();
    if (!e) return "--";
    const temp = getEntityAttribute<number>(e, "temperature");
    return temp != null ? formatTemp(temp) : "--";
  });
  const humidity = createMemo(() => {
    const e = entity();
    if (!e) return undefined;
    const val = getEntityAttribute<number>(e, "humidity");
    return val != null ? `${Math.round(val)}%` : undefined;
  });
  const windSpeed = createMemo(() => {
    const e = entity();
    if (!e) return undefined;
    const val = getEntityAttribute<number>(e, "wind_speed");
    const unit = getEntityAttribute<string>(e, "wind_speed_unit");
    return val != null ? formatWindSpeed(val, unit ?? undefined) : undefined;
  });
  const pressure = createMemo(() => {
    const e = entity();
    if (!e) return undefined;
    const val = getEntityAttribute<number>(e, "pressure");
    const unit = getEntityAttribute<string>(e, "pressure_unit") ?? "hPa";
    return val != null ? `${Math.round(val)} ${unit}` : undefined;
  });
  const feelsLike = createMemo(() => {
    const e = entity();
    if (!e) return undefined;
    const apparent = getEntityAttribute<number>(e, "apparent_temperature");
    const actual = getEntityAttribute<number>(e, "temperature");
    if (apparent == null || actual == null) return undefined;
    if (Math.round(apparent) === Math.round(actual)) return undefined;
    return formatTemp(apparent);
  });

  const showForecast = () => props.config.showForecast !== false;

  const hourlyData = createMemo(() => {
    const f = forecast();
    const hourly = f?.forecasts?.hourly;
    if (!hourly || hourly.length === 0) return [];
    return hourly.slice(0, 12).map((h) => ({
      temp: h.temperature ?? 0,
      time: h.datetime,
    }));
  });

  const dailyForecast = createMemo(() => {
    const f = forecast();
    return f?.forecasts?.daily?.slice(0, 7) ?? [];
  });

  const gestures = useWidgetGestures(() => ({
    hold: { action: openDialog },
  }));
  onCleanup(gestures.dispose);

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const e = entity();
    if (!e) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, [e], {
      forecast: forecast(),
    });
  });

  const formatDayName = (datetime: string) => {
    try {
      return new Date(datetime).toLocaleDateString(undefined, { weekday: "short" });
    } catch {
      return "";
    }
  };

  return (
    <>
      <Widget
        gestures={gestures}
        variant="classic-glass"
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
          <WeatherBackground condition={condition()} />
          <WeatherBody
            condition={condition()}
            temperature={temperature()}
            feelsLike={feelsLike()}
            humidity={humidity()}
            windSpeed={windSpeed()}
            pressure={pressure()}
            hasForecast={showForecast() && hourlyData().length > 1}
            hourlyData={hourlyData()}
          />
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Weather"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        controlsContent={
          <div class="flex flex-col gap-2">
            <h3 class="font-medium text-sm">7-Day Forecast</h3>
            <div class="flex flex-col gap-1">
              <For each={dailyForecast()}>
                {(day) => (
                  <div class="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm">
                    <span class="w-12 font-medium">{formatDayName(day.datetime)}</span>
                    <Icon icon={getWeatherIcon(day.condition ?? "cloudy")} width={20} />
                    <span class="w-20 text-right tabular-nums">
                      {day.temp_high != null
                        ? formatTemp(day.temp_high)
                        : formatTemp(day.temperature ?? 0)}
                      {day.temp_low != null && (
                        <span class="ml-1 opacity-60">{formatTemp(day.temp_low)}</span>
                      )}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>
        }
        debugContent={(() => {
          const data = debugData();
          return data ? <WidgetDebugView data={data} /> : undefined;
        })()}
        debugData={debugData()}
      />
    </>
  );
}

interface WeatherBodyProps {
  condition: string;
  temperature: string;
  feelsLike: string | undefined;
  humidity: string | undefined;
  windSpeed: string | undefined;
  pressure: string | undefined;
  hasForecast: boolean;
  hourlyData: Array<{ temp: number; time: string }>;
}

// Must render inside <Widget>: useWidgetDimensions throws in the top-level
// widget scope, which never sees real measurements.
function WeatherBody(props: WeatherBodyProps) {
  const dimensions = useWidgetDimensions();
  // Direct pixel thresholds. xs ≈ area ≤ 2 (≈ 1x1, 1x2): one tiny axis. lg/xl ≈ area ≥ 12 (4x2 / 4x4).
  const isSmall = () => {
    const d = dimensions();
    return d.width <= 150 || d.height <= 75;
  };
  const isLarge = () => {
    const d = dimensions();
    return d.width >= 600 || d.height >= 300;
  };

  return (
    <>
      <Widget.Content>
        <Show
          when={isSmall()}
          fallback={
            <HeroLayout
              condition={props.condition}
              temperature={props.temperature}
              feelsLike={props.feelsLike}
              humidity={props.humidity}
              windSpeed={props.windSpeed}
              pressure={props.pressure}
              isLarge={isLarge()}
              hasForecast={props.hasForecast}
            />
          }
        >
          <CompactLayout condition={props.condition} temperature={props.temperature} />
        </Show>
      </Widget.Content>

      {/* Forecast chart bleeds to widget edges so it sits below content */}
      <Show when={!isSmall() && props.hasForecast}>
        <div
          class={`absolute right-0 bottom-0 left-0 z-10 ${getSceneInkClass(props.condition)} ${getSceneGlyphShadowClass(props.condition)}`}
        >
          <ForecastChart data={props.hourlyData} height={90} />
        </div>
      </Show>
    </>
  );
}

interface HeroLayoutProps {
  condition: string;
  temperature: string;
  feelsLike: string | undefined;
  humidity: string | undefined;
  windSpeed: string | undefined;
  pressure: string | undefined;
  isLarge: boolean;
  hasForecast: boolean;
}

/**
 * Hero layout: icon+temp pair, condition+feels-like subtitle, metric strip.
 * Pressure shown on large only. Reserves bottom padding for forecast chart.
 */
function HeroLayout(props: HeroLayoutProps) {
  const metrics = () => {
    const out: Array<{ icon: string; value: string }> = [];
    if (props.humidity) out.push({ icon: "mdi:water-percent", value: props.humidity });
    if (props.windSpeed) out.push({ icon: "mdi:weather-windy", value: props.windSpeed });
    if (props.pressure && props.isLarge) out.push({ icon: "mdi:gauge", value: props.pressure });
    return out;
  };

  return (
    <div
      class={`relative z-10 flex h-full flex-col gap-1.5 ${getSceneInkClass(props.condition)}`}
      style={{
        "padding-bottom": props.hasForecast ? "96px" : undefined,
      }}
    >
      {/* Hero pair: icon + temp */}
      <div class="flex items-center gap-4">
        <Widget.Icon
          icon={<Icon icon={getWeatherIcon(props.condition)} />}
          color={getWeatherIconColor(props.condition)}
        />
        <span
          class="font-black leading-none"
          style={{
            "font-size": props.isLarge ? "3rem" : "2rem",
            "letter-spacing": "-0.04em",
          }}
        >
          {props.temperature}
        </span>
      </div>

      {/* Subtitle line */}
      <div class="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span class="font-semibold capitalize">{props.condition.replace(/-/g, " ")}</span>
        <Show when={props.feelsLike}>
          <span class="opacity-30">·</span>
          <span class="opacity-75">Feels like {props.feelsLike}</span>
        </Show>
      </div>

      {/* Metric strip — pinned bottom */}
      <Show when={metrics().length > 0}>
        <div class="flex items-center gap-2 text-xs">
          <For each={metrics()}>
            {(m, i) => (
              <>
                <Show when={i() > 0}>
                  <span class="opacity-30">·</span>
                </Show>
                <span class="flex items-center gap-1.5">
                  <Icon icon={m.icon} width={16} class="opacity-70" />
                  <span class="font-medium tabular-nums">{m.value}</span>
                </span>
              </>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

interface CompactLayoutProps {
  condition: string;
  temperature: string;
}

/** xs widgets: single icon + temperature, no metrics. */
function CompactLayout(props: CompactLayoutProps) {
  return (
    <div
      class={`relative z-10 flex h-full items-center gap-3 ${getSceneInkClass(props.condition)}`}
    >
      <Icon icon={getWeatherIcon(props.condition)} width={32} />
      <span class="font-bold leading-none" style={{ "font-size": "2.25rem" }}>
        {props.temperature}
      </span>
    </div>
  );
}

export default defineWidget<WeatherConfig>({
  manifest: {
    name: "Weather",
    description: "Weather conditions with animated backgrounds and forecast chart",
    icon: "mdi:weather-partly-cloudy",
    minSize: { w: 2, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Weather",
        size: { w: 2, h: 2 },
        config: { entityIds: ["weather.demo_partly_cloudy"], title: "Weather", showForecast: true },
      },
    ],
  },
  configSchema,
  component: WeatherWidget,
});
