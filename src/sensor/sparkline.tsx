import {
  monotoneCubicPath,
  useTranslation,
  useWidgetDimensions,
  Widget,
} from "@glasshome/widget-sdk";
import { sparkValue } from "./utils";
import {
  createMemo,
  createSignal,
  createUniqueId,
  For,
  type JSX,
  onCleanup,
  onMount,
  Show,
} from "solid-js";

export interface SparklinePoint {
  value: number;
  /** Unix seconds. */
  timestamp: number;
}

interface SparkChartProps {
  data: SparklinePoint[];
  /** Unix seconds the line starts at; the line always runs to now. */
  from: number;
  /** Share of the width before which no column is labelled (where a fade hides the line). */
  labelFrom?: number;
  color?: string;
}

const HOUR = 3600;
/** Whole-hour steps a column can take; the smallest that keeps labels apart wins. */
const STEPS_H = [1, 2, 3, 4, 6, 8, 12, 24, 48];
/** Below this box height the columns leave the line room to read. */
const AXIS_MIN_H = 80;
/** Where the line has faded in enough to carry a label, as a share of the width. */
const VISIBLE_FROM = 0.42;
/** From this tile size the line gets its own full-width band between the head and the value. */
const FULL_MIN = { width: 300, height: 320 };

/** The tile's line: behind the value on a small tile, its own band from 4x4 up. */
export function TileSparkline(props: { data: SparklinePoint[]; from: number }): JSX.Element {
  const tile = useWidgetDimensions();
  const full = () => tile().width >= FULL_MIN.width && tile().height >= FULL_MIN.height;
  return (
    <Widget.Layer>
      <div class="sensor-spark" data-full={full() || undefined}>
        <SparkChart data={props.data} from={props.from} labelFrom={full() ? 0 : VISIBLE_FROM} />
      </div>
    </Widget.Layer>
  );
}

/** A day column reads the day's average; one noon reading would say little about it. */
function dayMean(points: { timestamp: number; value: number }[], noon: number): number | undefined {
  const day = points.filter((p) => Math.abs(p.timestamp - noon) < 12 * HOUR);
  return day.length ? day.reduce((sum, p) => sum + p.value, 0) / day.length : undefined;
}

export function SparkChart(props: SparkChartProps): JSX.Element {
  const tools = useTranslation();
  const hourLabel = (seconds: number) => tools.formatDate(seconds * 1000, { hour: "numeric" });
  const dayLabel = (seconds: number) => tools.formatDate(seconds * 1000, { weekday: "short" });
  const fmt = (v: number) => sparkValue(tools, v);
  const color = () => props.color ?? "var(--widget-color)";
  const gradientId = createUniqueId();

  let containerRef!: HTMLDivElement;
  const [width, setWidth] = createSignal(0);
  const [height, setHeight] = createSignal(0);
  const [mounted, setMounted] = createSignal(false);

  onMount(() => {
    let frame = 0;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      if (Math.abs(rect.width - width()) > 1) setWidth(rect.width);
      if (Math.abs(rect.height - height()) > 1) setHeight(rect.height);
      // The paths exist once the first size lands; they paint undrawn for a frame, then draw in.
      if (!frame) frame = requestAnimationFrame(() => setMounted(true));
    });
    ro.observe(containerRef);
    onCleanup(() => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    });
  });

  const chartData = createMemo(() => {
    const w = width();
    const h = height();
    const to = Date.now() / 1000;
    const from = Math.min(props.from, to - HOUR);
    const data = props.data.filter((d) => d.timestamp >= from);
    const last = data.at(-1);
    if (!last || data.length < 2 || w === 0 || h === 0) return null;
    // A reading holds until the next one, so the line runs level to now.
    const series = last.timestamp < to ? [...data, { value: last.value, timestamp: to }] : data;

    const labelSize = Math.min(20, Math.max(11, h * 0.07));
    const showAxis = h >= AXIS_MIN_H;
    const top = labelSize + 8;
    const bottom = h - (showAxis ? labelSize + 10 : 2);
    const drawH = (bottom - top) * 0.85;

    const values = series.map((d) => d.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const minRange = Math.abs(rawMax + rawMin) * 0.05 || 1;
    const rawRange = rawMax - rawMin;
    const pad = rawRange < minRange ? (minRange - rawRange) / 2 : 0;
    const min = rawMin - pad;
    const range = rawMax + pad - min;

    const xAt = (t: number) => ((t - from) / (to - from)) * w;
    const points = series.map((d) => ({
      x: xAt(d.timestamp),
      y: bottom - ((d.value - min) / range) * drawH,
      value: d.value,
      timestamp: d.timestamp,
    }));

    const linePath = monotoneCubicPath(points);
    const first = points[0];
    const areaPath = `${linePath} L ${w} ${h} L ${first.x} ${h} Z`;

    // Columns like the weather curve: the reading above the line, its hour below, more as the tile widens.
    const columns: { x: number; y: number; value: string; time: string }[] = [];
    if (showAxis) {
      const pxPerHour = w / ((to - from) / HOUR);
      const gap = 26 + labelSize * 1.5;
      const step = STEPS_H.find((s) => s * pxPerHour >= gap) ?? 48;
      const daily = step >= 24;
      const at = new Date((to - (step * HOUR) / 3) * 1000);
      at.setMinutes(0, 0, 0);
      // Days sit at noon, the middle of the day they name.
      if (daily) {
        if (at.getHours() < 12) at.setDate(at.getDate() - 1);
        at.setHours(12);
      } else at.setHours(Math.floor(at.getHours() / step) * step);
      for (let t = at.getTime() / 1000; ; t -= step * HOUR) {
        const x = xAt(t);
        if (x < Math.max(gap / 2, w * (props.labelFrom ?? 0))) break;
        if (x > w - gap / 2) continue;
        const i = points.findIndex((p) => p.timestamp > t);
        const a = points[Math.max(0, i - 1)];
        // The label clears the line wherever it passes under the label, not just at its hour.
        const half = labelSize * 1.7;
        let top = a.y;
        for (const p of points) if (Math.abs(p.x - x) <= half && p.y < top) top = p.y;
        columns.unshift({
          x,
          y: top,
          value: fmt(daily ? (dayMean(points, t) ?? a.value) : a.value),
          time: daily ? dayLabel(t) : hourLabel(t),
        });
      }
    }

    return { areaPath, linePath, points, columns, labelSize, h };
  });

  const pathLength = createMemo(() => {
    const cd = chartData();
    if (!cd) return 0;
    let len = 0;
    for (let i = 1; i < cd.points.length; i++) {
      const dx = cd.points[i].x - cd.points[i - 1].x;
      const dy = cd.points[i].y - cd.points[i - 1].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return Math.ceil(len);
  });

  const reveal = (delay = false) => ({
    // ui-text-ok: css transition
    transition: `opacity var(--duration-state) var(--ease-morph)${delay ? " var(--duration-morph)" : ""}`,
  });

  return (
    <div ref={containerRef} class="sensor-spark-chart">
      <svg
        width={width()}
        height={height()}
        viewBox={`0 0 ${width()} ${height()}`}
        class="block"
        aria-hidden="true"
      >
        <Show when={chartData()}>
          {(cd) => (
            <>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color={color()} stop-opacity="0.32" />
                  <stop offset="100%" stop-color={color()} stop-opacity="0" />
                </linearGradient>
              </defs>

              <path
                d={cd().areaPath}
                fill={`url(#${gradientId})`}
                opacity={mounted() ? 1 : 0}
                // ui-text-ok: css transition
                style={{ transition: "opacity var(--duration-morph) var(--ease-morph)" }}
              />

              <path
                d={cd().linePath}
                fill="none"
                stroke={color()}
                stroke-width={Math.max(2, cd().labelSize / 6)}
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-dasharray={`${pathLength()}`}
                stroke-dashoffset={mounted() ? 0 : pathLength()}
                style={{
                  transition: "stroke-dashoffset var(--duration-morph) var(--ease-morph)",
                }}
              />

              <For each={cd().columns}>
                {(col) => (
                  <line
                    x1={col.x}
                    x2={col.x}
                    y1={
                      Math.max(cd().labelSize, col.y - cd().labelSize * 0.9) + cd().labelSize * 0.45
                    }
                    y2={cd().h - cd().labelSize * 0.85 - 10}
                    stroke="var(--muted-foreground)"
                    stroke-width="1"
                    stroke-dasharray="2 4"
                    stroke-linecap="round"
                    opacity={mounted() ? 0.45 : 0}
                    style={reveal(true)}
                  />
                )}
              </For>
            </>
          )}
        </Show>
      </svg>
      {/* SVG text makes WebKit lay out the whole board again on every layout, so labels are HTML. */}
      <Show when={chartData()}>
        {(cd) => (
          <For each={cd().columns}>
            {(col) => (
              <>
                <span
                  class="sensor-spark-label"
                  data-kind="value"
                  style={{
                    left: `${col.x}px`,
                    top: `${Math.max(cd().labelSize, col.y - cd().labelSize * 0.9)}px`,
                    "font-size": `${cd().labelSize}px`,
                    opacity: mounted() ? 0.9 : 0,
                    ...reveal(true),
                  }}
                >
                  {col.value}
                </span>
                <span
                  class="sensor-spark-label"
                  data-kind="time"
                  style={{
                    left: `${col.x}px`,
                    top: `${cd().h - 6}px`,
                    "font-size": `${cd().labelSize * 0.85}px`,
                    opacity: mounted() ? 0.85 : 0,
                    ...reveal(true),
                  }}
                >
                  {col.time}
                </span>
              </>
            )}
          </For>
        )}
      </Show>
    </div>
  );
}
