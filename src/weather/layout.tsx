import {
  Icon,
  useDaylight,
  useWidgetDimensions,
  type WeatherForecast,
  Widget,
} from "@glasshome/widget-sdk";
import { createMemo, createSignal, For, Index, Show } from "solid-js";
import { dayHigh, tempColor, weekRange } from "./forecast";
import { HourChart } from "./hour-chart";
import { useMotionPaused, WeatherFrost, WeatherSky } from "./sky";
import { formatTemp, getWeatherIcon, getWeatherIconColor, hourName, isStormy } from "./utils";

export interface Detail {
  icon: string;
  label: string;
  value: string;
  rotate?: number;
}

export interface Model {
  title: string | undefined;
  condition: string;
  wintry: boolean;
  temperature: string;
  sub: string;
  hours: WeatherForecast[];
  days: WeatherForecast[];
  details: Detail[];
}

type Tier = "compact" | "row" | "stack" | "split";

const PAD = 16;
const MAX_HOURS = 24;
const HOUR_PX = 26;
const LABEL_PX = 52;
const DAY_PX = 64;

function dayLabel(datetime: string, now: Date): string {
  const d = new Date(datetime);
  if (Number.isNaN(d.getTime())) return "";
  if (d.toDateString() === now.toDateString()) return "Today";
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

// Must render inside <Widget>: useWidgetDimensions throws outside it.
export function WeatherTile(props: { model: Model }) {
  const dims = useWidgetDimensions();
  const daylight = useDaylight();

  const tier = createMemo<Tier>(() => {
    const { width: w, height: h } = dims();
    if (h < 130) return w >= 520 ? "row" : "compact";
    return w >= 600 && h >= 300 ? "split" : "stack";
  });
  // One factor from the box: type and the band grow with the tile instead of floating in it.
  const scale = createMemo(() => {
    const { width: w, height: h } = dims();
    if (tier() !== "split") return 1;
    return Math.round(Math.min(1.9, Math.max(1, Math.min(w / 620, h / 330))) * 20) / 20;
  });
  const text = () => Math.min(scale(), 1.4);
  const chartShare = () => (dims().width >= 1000 ? 0.5 : 0.62);
  const chartWidth = () => (tier() === "split" ? dims().width * chartShare() : dims().width);

  const hourCount = createMemo(() => {
    const { width: w, height: h } = dims();
    let fit = 0;
    if (tier() === "row") fit = Math.floor((w * 0.5) / 64);
    if (tier() === "stack" && h >= 200) fit = Math.floor((chartWidth() - PAD) / HOUR_PX);
    if (tier() === "split") fit = Math.floor((chartWidth() - PAD) / (HOUR_PX * text()));
    const n = Math.min(MAX_HOURS, fit, props.model.hours.length);
    return n >= 4 ? n : 0;
  });
  const dayCount = createMemo(() => {
    const { width: w, height: h } = dims();
    let fit = 0;
    if (tier() === "stack" && h >= 440) fit = Math.floor((w - PAD * 2) / DAY_PX);
    if (tier() === "split")
      fit = Math.floor((w * (w >= 1000 ? 0.3 : 0.38) - PAD) / (DAY_PX * text()));
    const n = Math.min(10, fit, props.model.days.length);
    return n >= 3 ? n : 0;
  });
  const detailCount = createMemo(() => {
    const { width: w, height: h } = dims();
    if (tier() !== "split" || w < 1000) return 0;
    return Math.min(props.model.details.length, h >= 560 ? 6 : 4);
  });
  // Label only every k-th hour so labels keep their width at any density.
  const labelEvery = () => {
    const n = hourCount();
    return n ? Math.max(1, Math.ceil((LABEL_PX * text()) / ((chartWidth() - PAD) / n))) : 1;
  };
  const dark = () => daylight().phase === "night" || isStormy(props.model.condition);
  const [layoutEl, setLayoutEl] = createSignal<HTMLDivElement>();
  const paused = useMotionPaused(layoutEl);

  const hasBand = () => hourCount() > 0 && tier() !== "row";
  const sideScene = () => tier() === "row" && hourCount() > 0;
  // The picture gets its own region; small text only ever sits on the glass below it.
  const sceneShare = () => {
    if (!hasBand()) return 1;
    if (tier() === "split") return 0.78;
    return dayCount() > 0 ? 0.5 : 0.66;
  };

  return (
    <Widget.Content
      accent={getWeatherIconColor(props.model.condition)}
      class={["weather", hasBand() || sideScene() ? "" : "wx-plain", paused() ? "wx-paused" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <Widget.Layer class="wx-layers">
        <Show when={hasBand() || sideScene()}>
          <WeatherFrost
            condition={props.model.condition}
            wintry={props.model.wintry}
            night={daylight().phase === "night"}
          />
        </Show>
        <div
          class="wx-scene"
          classList={{ dark: dark() }}
          data-tier={tier()}
          data-side={sideScene() || undefined}
          style={
            sideScene()
              ? { width: `${Math.round(dims().width * 0.3)}px` }
              : sceneShare() < 1
                ? { height: `${Math.round(dims().height * sceneShare())}px` }
                : undefined
          }
        >
          <WeatherSky condition={props.model.condition} wintry={props.model.wintry} />
        </div>
        <div
          ref={setLayoutEl}
          class="wx-layout"
          data-tier={tier()}
          data-rich={(tier() === "stack" && hourCount() > 0) || undefined}
          style={{ "--wx-s": scale(), "--wx-t": text() }}
        >
          <div class="wx-now" classList={{ dark: dark() }}>
            <Show when={props.model.title}>
              <span class="wx-title">{props.model.title}</span>
            </Show>
            <span class="wx-now-temp">
              {props.model.temperature}
              <span class="wx-degree">°</span>
            </span>
            <span class="wx-cond">{props.model.sub}</span>
          </div>
          <Show when={hourCount() > 0 || dayCount() > 0}>
            <div class="wx-band">
              <Show when={dayCount() > 0 && tier() === "stack"}>
                <Days days={props.model.days.slice(0, dayCount())} />
              </Show>
              <Show when={hourCount() > 0}>
                <Show
                  when={tier() !== "row"}
                  fallback={<HourRow hours={props.model.hours.slice(0, hourCount())} />}
                >
                  <HourChart
                    hours={props.model.hours.slice(0, hourCount())}
                    labelEvery={labelEvery()}
                  />
                </Show>
              </Show>
              <Show when={dayCount() > 0 && tier() === "split"}>
                <Days days={props.model.days.slice(0, dayCount())} />
              </Show>
              <Show when={detailCount() > 0}>
                <Details details={props.model.details.slice(0, detailCount())} />
              </Show>
            </div>
          </Show>
        </div>
      </Widget.Layer>
    </Widget.Content>
  );
}

function HourRow(props: { hours: WeatherForecast[] }) {
  return (
    <ol class="wx-row-hours" aria-label="Next hours">
      <Index each={props.hours}>
        {(h, i) => (
          <li>
            <span class="wx-label">{hourName(h().datetime, i)}</span>
            <span class="wx-temp">{formatTemp(h().temperature ?? 0)}</span>
          </li>
        )}
      </Index>
    </ol>
  );
}

/** Each day's low-to-high as a floating bar on the week's scale: warm days sit high, cold days low. */
function Days(props: { days: WeatherForecast[] }) {
  const range = createMemo(() => weekRange(props.days));
  const pct = (t: number) => {
    const r = range();
    return r ? ((r.max - t) / (r.max - r.min)) * 100 : 0;
  };
  return (
    <ol class="wx-days" aria-label="Next days">
      <Index each={props.days}>
        {(d) => {
          const high = () => dayHigh(d()) ?? 0;
          const low = () => d().temp_low ?? high();
          const rain = () => d().precipitation_probability ?? 0;
          return (
            <li class="wx-day">
              <span class="wx-label">{dayLabel(d().datetime, new Date())}</span>
              <Icon icon={getWeatherIcon(d().condition ?? "cloudy")} class="wx-icon" />
              <span class="wx-rain">{rain() >= 20 ? `${rain()}%` : ""}</span>
              <span class="wx-range">
                <span
                  class="wx-range-bar"
                  style={{
                    top: `${pct(high())}%`,
                    bottom: `${100 - pct(low())}%`,
                    background: `linear-gradient(to bottom, ${tempColor(high())}, ${tempColor(low())})`,
                  }}
                >
                  <span class="wx-temp wx-range-high">{formatTemp(high())}</span>
                  <span class="wx-range-low">{formatTemp(low())}</span>
                </span>
              </span>
            </li>
          );
        }}
      </Index>
    </ol>
  );
}

function Details(props: { details: Detail[] }) {
  return (
    <dl class="wx-details">
      <For each={props.details}>
        {(d) => (
          <div class="wx-detail">
            <dt class="wx-label">
              <Icon
                icon={d.icon}
                style={d.rotate != null ? { transform: `rotate(${d.rotate}deg)` } : undefined}
              />
              {d.label}
            </dt>
            <dd>{d.value}</dd>
          </div>
        )}
      </For>
    </dl>
  );
}
