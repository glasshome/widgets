import {
  type PanelFact,
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

const hourLabel = (datetime: string) =>
  new Date(datetime).toLocaleTimeString(undefined, { hour: "numeric" });

function dayLabel(datetime: string, now: Date): string {
  const d = new Date(datetime);
  if (Number.isNaN(d.getTime())) return "";
  if (d.toDateString() === now.toDateString()) return "Today";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

const rain = (f: WeatherForecast) => {
  const p = f.precipitation_probability ?? 0;
  return p >= 20 ? ` · ${Math.round(p)}% rain` : "";
};

const dayRange = (d: WeatherForecast) => {
  const high = dayHigh(d) ?? 0;
  return `${formatTemp(high)} / ${formatTemp(d.temp_low ?? high)}${rain(d)}`;
};

/** What the weather tile cannot show: the coming hours and days, and the readings beyond the temperature. */
export function WeatherSheet(props: {
  hours: WeatherForecast[];
  days: WeatherForecast[];
  details: Detail[];
}) {
  const hourFacts = (): PanelFact[] =>
    props.hours
      .slice(1)
      .filter((_, i) => i % HOUR_STEP === 0)
      .slice(0, HOUR_SLOTS)
      .map((h) => ({
        icon: getWeatherIcon(h.condition ?? "cloudy"),
        label: hourLabel(h.datetime),
        value: formatTemp(h.temperature ?? 0),
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
        <PanelSection label="Next hours">
          <PanelFacts items={hourFacts()} />
        </PanelSection>
      </Show>
      <Show when={props.days.length}>
        <PanelSection label="Next days">
          <PanelRows>
            <For each={props.days.slice(0, DAY_ROWS)}>
              {(d) => (
                <PanelRow
                  icon={getWeatherIcon(d.condition ?? "cloudy")}
                  name={dayLabel(d.datetime, new Date())}
                  state={dayRange(d)}
                  tone={getWeatherIconColor(d.condition ?? "cloudy")}
                  on
                />
              )}
            </For>
          </PanelRows>
        </PanelSection>
      </Show>
      <Show when={readings().length}>
        <PanelSection label="Right now">
          <PanelFacts items={readings()} />
        </PanelSection>
      </Show>
    </>
  );
}
