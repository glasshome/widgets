import {
  type EntityView,
  getEntityAttribute,
  type PanelFact,
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
} from "@glasshome/widget-sdk";
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import { getSensorIcon } from "../common";
import { SparkChart } from "./sparkline";
import { downsample, formatSensorValue, type Reading, readingsWithin, summarize } from "./utils";

type Range = "6h" | "24h" | "7d";

const RANGES: { id: Range; label: string; hours: number; words: string }[] = [
  { id: "6h", label: "6 h", hours: 6, words: "Last 6 hours" },
  { id: "24h", label: "24 h", hours: 24, words: "Last 24 hours" },
  { id: "7d", label: "7 d", hours: 24 * 7, words: "Last 7 days" },
];

const HOUR_MS = 3_600_000;
const CHART_POINTS = 120;
const CHART_HEIGHT = 168;
const INK = "var(--tone-info)";

const deviceClassOf = (e: EntityView) =>
  e.deviceClass ?? getEntityAttribute<string>(e, "device_class") ?? null;

function readingText(e: EntityView): string {
  const n = Number(e.state);
  if (Number.isNaN(n)) return e.state;
  const value = formatSensorValue(n, deviceClassOf(e));
  return e.unitOfMeasurement ? `${value} ${e.unitOfMeasurement}` : value;
}

/** What the sensor tile cannot show: the first sensor's history over a chosen range, and every sensor's reading. */
export function SensorSheet(props: { entities: EntityView[] }) {
  const [range, setRange] = createSignal<Range>("24h");
  const shown = () => props.entities[0];
  const shownId = () => shown()?.id ?? "";
  const spec = () => RANGES.find((r) => r.id === range()) ?? RANGES[1];

  createEffect(() => {
    const id = shownId();
    if (!id) return;
    trackEntityHistory(id, { startTime: new Date(Date.now() - 24 * HOUR_MS) }).catch(() => {});
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
    const current = Number(shown()?.state);
    if (!Number.isNaN(current)) raw.push({ t: now, value: current });
    return readingsWithin(raw, now - spec().hours * HOUR_MS, now);
  });

  const summary = createMemo(() => {
    const base = summarize(readings(), Date.now());
    if (range() !== "7d" || !base) return base;
    const buckets = week() ?? [];
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
    const v = formatSensorValue(
      n,
      e ? deviceClassOf(e) : null,
      Math.abs(n) >= 1000 ? 0 : undefined,
    );
    return e?.unitOfMeasurement ? `${v} ${e.unitOfMeasurement}` : v;
  };

  const facts = (): PanelFact[] => {
    const s = summary();
    return s
      ? [
          { icon: "mdi:arrow-down", label: "Low", value: fmt(s.min) },
          { icon: "mdi:arrow-up", label: "High", value: fmt(s.max) },
          { icon: "mdi:approximately-equal", label: "Average", value: fmt(s.average) },
        ]
      : [{ icon: "mdi:chart-line", label: "History", value: "None for this range yet" }];
  };

  const historyLabel = () =>
    props.entities.length > 1
      ? `${shown()?.friendlyName ?? "History"}, ${spec().words.toLowerCase()}`
      : spec().words;

  return (
    <>
      <PanelSection label={historyLabel()}>
        <ToggleGroup
          aria-label="Range"
          value={range()}
          onChange={(v: string | null) => v && setRange(v as Range)}
        >
          <For each={RANGES}>
            {(r) => <ToggleGroupItem value={r.id}>{r.label}</ToggleGroupItem>}
          </For>
        </ToggleGroup>
        <div style={{ height: `${CHART_HEIGHT}px` }}>
          <SparkChart
            data={downsample(readings(), CHART_POINTS).map((r) => ({
              value: r.value,
              timestamp: r.t / 1000,
            }))}
            from={(Date.now() - spec().hours * HOUR_MS) / 1000}
            color={INK}
          />
        </div>
        <PanelFacts items={facts()} />
      </PanelSection>
      <Show when={props.entities.length > 1}>
        <PanelSection label="Sensors">
          <PanelRows>
            <For each={props.entities}>
              {(e) => (
                <PanelRow
                  icon={getSensorIcon(deviceClassOf(e))}
                  name={e.friendlyName}
                  state={readingText(e)}
                  tone={INK}
                  on
                />
              )}
            </For>
          </PanelRows>
        </PanelSection>
      </Show>
    </>
  );
}
