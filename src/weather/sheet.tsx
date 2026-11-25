import {
  type PanelFact,
  type TranslationTools,
  useTranslation,
  PanelFacts,
  PanelRow,
  PanelRows,
  PanelSection,
  type WeatherForecast,
} from "@glasshome/widget-sdk";
import { For, Show } from "solid-js";
import { dayHigh } from "./forecast";
import type { Detail } from "./layout";
import { formatTemp, getWeatherIcon, getWeatherIconColor } from "./utils";

const HOUR_STEP = 3;
const HOUR_SLOTS = 6;
const DAY_ROWS = 7;

type Tools = Pick<TranslationTools, "t" | "formatDate" | "formatNumber" | "translateState">;

function dayLabel(tools: Tools, datetime: string, now: Date): string {
  const d = new Date(datetime);
  if (Number.isNaN(d.getTime())) return "";
  if (d.toDateString() === now.toDateString()) return tools.t("weather.day.today");
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return tools.t("weather.day.tomorrow");
  return tools.formatDate(d, { weekday: "long" });
}

export function dayRange(tools: Tools, d: WeatherForecast): string {
  const high = formatTemp(tools, dayHigh(d) ?? 0);
  const low = formatTemp(tools, d.temp_low ?? dayHigh(d) ?? 0);
  const p = d.precipitation_probability ?? 0;
  if (p < 20) return tools.t("weather.sheet.day-range", { high, low });
  const chance = tools.formatNumber(Math.round(p) / 100, { style: "percent" });
  return tools.t("weather.sheet.day-range-rain", { high, low, chance });
}

/** What the weather tile cannot show: the coming hours and days, and the readings beyond the temperature. */
export function WeatherSheet(props: {
  hours: WeatherForecast[];
  days: WeatherForecast[];
  details: Detail[];
}) {
  const tools = useTranslation();
  const hourFacts = (): PanelFact[] =>
    props.hours
      .slice(1)
      .filter((_, i) => i % HOUR_STEP === 0)
      .slice(0, HOUR_SLOTS)
      .map((h) => ({
        icon: getWeatherIcon(h.condition ?? "cloudy"),
        label: tools.formatDate(new Date(h.datetime), { hour: "numeric" }),
        value: formatTemp(tools, h.temperature ?? 0),
      }));

  const readings = (): PanelFact[] =>
    props.details.map((d) => ({
      icon: d.rotate != null ? "mdi:weather-windy" : d.icon,
      label: d.label,
      value: d.value,
    }));

  return (
    <>
      <Show when={hourFacts().length}>
        <PanelSection label={tools.t("weather.sheet.next-hours")}>
          <PanelFacts items={hourFacts()} />
        </PanelSection>
      </Show>
      <Show when={props.days.length}>
        <PanelSection label={tools.t("weather.sheet.next-days")}>
          <PanelRows>
            <For each={props.days.slice(0, DAY_ROWS)}>
              {(d) => (
                <PanelRow
                  icon={getWeatherIcon(d.condition ?? "cloudy")}
                  name={dayLabel(tools, d.datetime, new Date())}
                  state={dayRange(tools, d)}
                  tone={getWeatherIconColor(d.condition ?? "cloudy")}
                  on
                />
              )}
            </For>
          </PanelRows>
        </PanelSection>
      </Show>
      <Show when={readings().length}>
        <PanelSection label={tools.t("weather.sheet.right-now")}>
          <PanelFacts items={readings()} />
        </PanelSection>
      </Show>
    </>
  );
}
