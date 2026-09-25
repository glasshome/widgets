import {
  PanelFacts,
  type PanelFact,
  PanelRow,
  PanelRows,
  PanelSection,
  useDaylight,
  type WeatherForecast,
  WidgetPanel,
} from "@glasshome/widget-sdk";
import { For, Show } from "solid-js";
import { dayHigh } from "./forecast";
import type { Detail } from "./layout";
import { sceneMarks, scenePhotos } from "./sky";
import {
  formatTemp,
  getConditionLabel,
  getWeatherIcon,
  getWeatherIconColor,
  isStormy,
} from "./utils";

const HOUR_STEP = 3;
const HOUR_SLOTS = 4;
const FACTS_PER_STRIP = 3;

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

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** The weather held: the tile's sky full size, the coming hours and days, and every reading. */
export function WeatherPanel(props: {
  name: string;
  condition: string;
  wintry: boolean;
  temperature: string;
  hours: WeatherForecast[];
  days: WeatherForecast[];
  details: Detail[];
}) {
  const daylight = useDaylight();
  const photos = () =>
    scenePhotos(props.condition, props.wintry, daylight().phase === "night");
  const dim = () =>
    daylight().phase === "night" || isStormy(props.condition) ? "brightness(0.72)" : undefined;

  const today = () => props.days[0];
  const caption = () => {
    const d = today();
    const high = d ? dayHigh(d) : undefined;
    const low = d?.temp_low;
    return high != null && low != null
      ? `High ${formatTemp(high)} · Low ${formatTemp(low)}`
      : undefined;
  };

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
    <WidgetPanel
      icon={getWeatherIcon(props.condition)}
      tone={getWeatherIconColor(props.condition)}
      eyebrow={getConditionLabel(props.condition)}
      name={props.name}
      backdrop={
        <>
          <img src={photos().sky} alt="" style={{ "object-position": "center top", filter: dim() }} />
          <img src={photos().land} alt="" style={{ "object-position": "center 62%", filter: dim() }} />
          <img src={photos().near} alt="" style={{ "object-position": "center 62%", filter: dim() }} />
          <For each={sceneMarks(props.condition)}>
            {(m) => (
              <div
                style={{
                  "background-image": m.image,
                  "background-size": `${m.size}px ${m.size}px`,
                }}
              />
            )}
          </For>
        </>
      }
      value={
        <>
          {props.temperature}
          <small>°</small>
        </>
      }
      caption={caption()}
    >
      <Show when={hourFacts().length}>
        <PanelSection label="Next hours">
          <PanelFacts items={hourFacts()} />
        </PanelSection>
      </Show>
      <Show when={props.days.length}>
        <PanelSection label="Next days">
          <PanelRows>
            <For each={props.days.slice(0, 7)}>
              {(d) => (
                <PanelRow
                  icon={getWeatherIcon(d.condition ?? "cloudy")}
                  name={dayLabel(d.datetime, new Date())}
                  state={`${formatTemp(dayHigh(d) ?? 0)} / ${formatTemp(d.temp_low ?? dayHigh(d) ?? 0)}${rain(d)}`}
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
          <For each={chunk(readings(), FACTS_PER_STRIP)}>
            {(strip) => <PanelFacts items={strip} />}
          </For>
        </PanelSection>
      </Show>
    </WidgetPanel>
  );
}
