import { getForecasts } from "@glasshome/sync-layer";
import { useEntity, useForecast } from "@glasshome/sync-layer/solid";
import {
  defineWidget,
  getEntityAttribute,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  WidgetDialog,
  widgetFields,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, For, onCleanup, onMount, Show } from "solid-js";
import { z } from "zod";
import type { WidgetDebugData } from "../common";
import { buildDebugData, WidgetDebugView, widgetDialogProps } from "../common";
import { ForecastChart } from "./forecast-chart";
import { formatTemp, formatWindSpeed, getWeatherIcon } from "./utils";
import { WeatherBackground } from "./weather-background";

const configSchema = z.object({
  title: widgetFields.title(),
  entityIds: widgetFields.entityIds("weather"),
  showForecast: z.boolean().default(true).meta({ title: "Show Forecast" }),
});
type WeatherConfig = z.infer<typeof configSchema>;

const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

function WeatherWidget(props: { config: WeatherConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();

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
    const val = getEntityAttribute<number>(entity()!, "humidity");
    return val != null ? `${Math.round(val)}%` : undefined;
  });
  const windSpeed = createMemo(() => {
    const val = getEntityAttribute<number>(entity()!, "wind_speed");
    const unit = getEntityAttribute<string>(entity()!, "wind_speed_unit");
    return val != null ? formatWindSpeed(val, unit ?? undefined) : undefined;
  });

  const showForecast = () => props.config.showForecast !== false;
  const size = () => ctx.size();
  const isLarge = () => size() === "lg" || size() === "xl";
  const isSmall = () => size() === "xs" || size() === "sm";

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

  const gestures = useWidgetGestures(
    () => ({
      hold: { action: openDialog, delay: 300 },
    }),
    () => ctx.orientation(),
  );
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
      <div
        class="h-full w-full"
        on:pointerenter={gestures.onPointerEnter}
        on:pointerdown={gestures.onPointerDown}
        on:pointermove={gestures.onPointerMove}
        on:pointerup={gestures.onPointerUp}
        on:pointercancel={gestures.onPointerCancel}
      >
        <Widget
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
            <Widget.Content>
              <div
                class={`relative z-10 flex h-full flex-col text-foreground ${
                  isLarge() && showForecast() && hourlyData().length > 1
                    ? "gap-2"
                    : "justify-between"
                }`}
                style={{ "text-shadow": "0 1px 3px rgba(0,0,0,0.4)" }}
              >
                {/* Main weather display */}
                <div class="flex items-center gap-3">
                  <Icon icon={getWeatherIcon(condition())} width={isSmall() ? 28 : 36} />
                  <div class="flex flex-col overflow-hidden">
                    <span class="font-bold text-2xl leading-tight">{temperature()}</span>
                    <Show when={!isSmall()}>
                      <span class="truncate text-sm capitalize opacity-90">
                        {condition().replace(/-/g, " ")}
                      </span>
                    </Show>
                  </div>
                </div>

                {/* Metrics row */}
                <Show when={!isSmall()}>
                  <div class="flex gap-3 text-xs opacity-80">
                    <Show when={humidity()}>
                      <span class="flex items-center gap-1">
                        <Icon icon="mdi:water-percent" width={14} />
                        {humidity()}
                      </span>
                    </Show>
                    <Show when={windSpeed()}>
                      <span class="flex items-center gap-1">
                        <Icon icon="mdi:weather-windy" width={14} />
                        {windSpeed()}
                      </span>
                    </Show>
                  </div>
                </Show>
              </div>
            </Widget.Content>

            {/* Forecast chart — outside Widget.Content so it bleeds edge-to-edge */}
            <Show when={isLarge() && showForecast() && hourlyData().length > 1}>
              <div class="absolute bottom-0 left-0 right-0 z-10 text-white">
                <ForecastChart data={hourlyData()} height={90} />
              </div>
            </Show>
          </Show>
        </Widget>
      </div>
      <WidgetDialog
        {...widgetDialogProps}
        open={showDialog()}
        onOpenChange={setShowDialog}
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
        debugContent={debugData() ? <WidgetDebugView data={debugData()!} /> : undefined}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<WeatherConfig>({
  manifest: {
    name: "Weather",
    description: "Weather conditions with animated backgrounds and forecast chart",
    icon: "mdi:weather-partly-cloudy",
    minSize: { w: 2, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^0.3.0",
  },
  configSchema,
  component: WeatherWidget,
});
