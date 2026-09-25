import {
  type EntityView,
  getEntityAttribute,
  monotoneCubicPath,
  PanelFacts,
  PanelRow,
  PanelRows,
  PanelSection,
  ToggleGroup,
  ToggleGroupItem,
  trackEntityHistory,
  untrackEntityHistory,
  useEntityHistory,
  useEntityStatistics,
  useLocale,
  WidgetPanel,
} from "@glasshome/widget-sdk";
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  onCleanup,
  Show,
} from "solid-js";
import { getSensorIcon } from "../common";
import {
  downsample,
  formatSensorValue,
  type Reading,
  readingsWithin,
  summarize,
  timeAgo,
} from "./utils";

type Range = "6h" | "24h" | "7d";

const RANGES: { id: Range; label: string; hours: number; words: string }[] = [
  { id: "6h", label: "6 h", hours: 6, words: "Last 6 hours" },
  { id: "24h", label: "24 h", hours: 24, words: "Last 24 hours" },
  { id: "7d", label: "7 d", hours: 24 * 7, words: "Last 7 days" },
];

const HOUR_MS = 3_600_000;
const CHART_POINTS = 120;

const deviceClassOf = (e: EntityView) =>
  e.deviceClass ?? getEntityAttribute<string>(e, "device_class") ?? null;

function reading(e: EntityView): { value: string; unit: string } {
  const n = Number(e.state);
  if (Number.isNaN(n)) return { value: e.state, unit: "" };
  return { value: formatSensorValue(n, deviceClassOf(e)), unit: e.unitOfMeasurement ?? "" };
}

/** The last hours of one sensor as a filled line, drawn to whatever box it is given. */
function HistoryChart(props: { readings: Reading[] }) {
  const id = createUniqueId();
  const shape = createMemo(() => {
    const pts = props.readings;
    const first = pts[0];
    const last = pts.at(-1);
    if (!first || !last || pts.length < 2) return undefined;
    const values = pts.map((p) => p.value);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const span = hi - lo || Math.abs(hi) * 0.1 || 1;
    const t0 = first.t;
    const dt = last.t - t0 || 1;
    const points = pts.map((p) => ({
      x: ((p.t - t0) / dt) * 100,
      y: 90 - ((p.value - lo) / span) * 70,
    }));
    const line = monotoneCubicPath(points);
    return { line, area: `${line} L 100 100 L 0 100 Z` };
  });
  return (
    <Show when={shape()}>
      {(s) => (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" style={{ "stop-color": "var(--widget-color)", "stop-opacity": 0.35 }} />
              <stop offset="1" style={{ "stop-color": "var(--widget-color)", "stop-opacity": 0 }} />
            </linearGradient>
          </defs>
          <path d={s().area} fill={`url(#${id})`} />
          <path
            d={s().line}
            fill="none"
            vector-effect="non-scaling-stroke"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            style={{ stroke: "var(--widget-color)" }}
          />
        </svg>
      )}
    </Show>
  );
}

/** A sensor held: its reading over the hours or the week, and the range's low, high and average. */
export function SensorPanel(props: { entities: EntityView[]; name: string; icon: string }) {
  const locale = useLocale();
  const [range, setRange] = createSignal<Range>("24h");
  const [chosenId, setChosenId] = createSignal<string>();

  const shown = createMemo(
    () => props.entities.find((e) => e.id === chosenId()) ?? props.entities[0],
  );
  const shownId = () => shown()?.id ?? "";
  const spec = () => RANGES.find((r) => r.id === range()) ?? RANGES[1];

  createEffect(() => {
    const id = shownId();
    if (!id) return;
    void trackEntityHistory(id, { startTime: new Date(Date.now() - 24 * HOUR_MS) });
    onCleanup(() => untrackEntityHistory(id));
  });
  const history = useEntityHistory(shownId);

  const week = useEntityStatistics(
    () => (range() === "7d" ? shownId() : ""),
    () => ({ startTime: new Date(Date.now() - 7 * 24 * HOUR_MS), period: "hour" as const }),
  );

  const readings = createMemo((): Reading[] => {
    const now = Date.now();
    if (range() === "7d") {
      return (week() ?? []).flatMap((b) => {
        const value = b.mean ?? b.state;
        return value === undefined ? [] : [{ t: b.start, value }];
      });
    }
    const raw = (history()?.timeline ?? [])
      .map((p) => ({ t: p.timestamp * 1000, value: Number(p.state) }))
      .filter((p) => !Number.isNaN(p.value));
    const live = shown();
    const current = live ? Number(live.state) : Number.NaN;
    if (!Number.isNaN(current)) raw.push({ t: now, value: current });
    return readingsWithin(raw, now - spec().hours * HOUR_MS, now);
  });

  const summary = createMemo(() => {
    if (range() !== "7d") return summarize(readings(), Date.now());
    const buckets = week() ?? [];
    const base = summarize(readings(), Date.now());
    if (!base) return undefined;
    const mins = buckets.flatMap((b) => (b.min === undefined ? [] : [b.min]));
    const maxes = buckets.flatMap((b) => (b.max === undefined ? [] : [b.max]));
    return {
      average: base.average,
      min: mins.length ? Math.min(...mins) : base.min,
      max: maxes.length ? Math.max(...maxes) : base.max,
    };
  });

  const fmt = (n: number) => {
    const e = shown();
    const unit = e?.unitOfMeasurement;
    const v = formatSensorValue(n, e ? deviceClassOf(e) : null, Math.abs(n) >= 1000 ? 0 : undefined);
    return unit ? `${v} ${unit}` : v;
  };

  const facts = () => {
    const s = summary();
    return s
      ? [
          { icon: "mdi:arrow-down", label: "Low", value: fmt(s.min) },
          { icon: "mdi:arrow-up", label: "High", value: fmt(s.max) },
          { icon: "mdi:approximately-equal", label: "Average", value: fmt(s.average) },
        ]
      : [];
  };

  const updated = () => {
    const e = shown();
    return e ? `Updated ${timeAgo(e.lastUpdated, new Date(), locale()).toLowerCase()}` : "";
  };

  const icon = () => {
    const e = shown();
    return e ? getSensorIcon(deviceClassOf(e)) : props.icon;
  };

  const now = () => {
    const e = shown();
    return e ? reading(e) : undefined;
  };

  return (
    <WidgetPanel
      icon={icon()}
      tone="var(--tone-info)"
      eyebrow={props.entities.length > 1 ? shown()?.friendlyName : undefined}
      name={props.name}
      art={<HistoryChart readings={downsample(readings(), CHART_POINTS)} />}
      value={
        <Show when={now()}>
          {(r) => (
            <>
              {r().value}
              <Show when={r().unit}>
                <small>{r().unit}</small>
              </Show>
            </>
          )}
        </Show>
      }
      caption={updated()}
      actions={
        <ToggleGroup
          aria-label="Range"
          value={range()}
          onChange={(v: string | null) => v && setRange(v as Range)}
        >
          <For each={RANGES}>
            {(r) => <ToggleGroupItem value={r.id}>{r.label}</ToggleGroupItem>}
          </For>
        </ToggleGroup>
      }
    >
      <PanelSection label={spec().words}>
        <Show when={facts().length} fallback={<PanelFacts items={[{ icon: "mdi:chart-line", label: "History", value: "None for this range yet" }]} />}>
          <PanelFacts items={facts()} />
        </Show>
      </PanelSection>
      <Show when={props.entities.length > 1}>
        <PanelSection label="Sensors">
          <PanelRows>
            <For each={props.entities}>
              {(e) => (
                <PanelRow
                  icon={getSensorIcon(deviceClassOf(e))}
                  name={e.friendlyName}
                  state={`${reading(e).value}${reading(e).unit ? ` ${reading(e).unit}` : ""}`}
                  tone="var(--tone-info)"
                  on={e.id === shownId()}
                  onTap={() => setChosenId(e.id)}
                  aria-label={`Show ${e.friendlyName}`}
                />
              )}
            </For>
          </PanelRows>
        </PanelSection>
      </Show>
    </WidgetPanel>
  );
}
