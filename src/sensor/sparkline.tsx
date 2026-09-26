import { monotoneCubicPath } from "@glasshome/widget-sdk";
import { createMemo, createSignal, For, type JSX, onCleanup, onMount, Show } from "solid-js";

export interface SparklinePoint {
  value: number;
  /** Unix seconds. */
  timestamp: number;
}

interface SparklineProps {
  data: SparklinePoint[];
  /** Unix seconds the line starts at; the line always runs to now. */
  from: number;
  color?: string;
}

const HOUR = 3600;
const TICK_EVERY_H = 6;
/** Below this box height the hour marks leave the line room to read. */
const AXIS_MIN_H = 110;

const hourLabel = (seconds: number) =>
  new Date(seconds * 1000).toLocaleTimeString(undefined, { hour: "numeric" });

const fmt = (v: number) => {
  if (Math.abs(v) >= 100) return Math.round(v).toString();
  if (Math.abs(v) >= 10) return v.toFixed(1).replace(/\.0$/, "");
  return v.toFixed(1);
};

export function Sparkline(props: SparklineProps): JSX.Element {
  const color = () => props.color ?? "var(--widget-color)";

  let containerRef!: HTMLDivElement;
  const [width, setWidth] = createSignal(0);
  const [height, setHeight] = createSignal(0);
  const [mounted, setMounted] = createSignal(false);

  onMount(() => {
    setWidth(containerRef.clientWidth);
    setHeight(containerRef.clientHeight);
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      if (Math.abs(rect.width - width()) > 1) setWidth(rect.width);
      if (Math.abs(rect.height - height()) > 1) setHeight(rect.height);
    });
    ro.observe(containerRef);
    onCleanup(() => ro.disconnect());
    requestAnimationFrame(() => setMounted(true));
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

    const labelSize = Math.min(24, Math.max(11, h * 0.075));
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
    const areaPath = `M ${first.x} ${h} L ${first.x} ${first.y} ${linePath.slice(linePath.indexOf("C"))} L ${w} ${h} Z`;

    let peak = points[0];
    for (const p of points) if (p.value > peak.value) peak = p;
    const peakAnchor: "start" | "middle" | "end" =
      peak.x < 40 ? "start" : peak.x > w - 40 ? "end" : "middle";

    // Whole local hours on the 6-hour grid, only where the line has faded in.
    const ticks: { x: number; label: string }[] = [];
    if (showAxis) {
      const start = new Date(from * 1000);
      start.setMinutes(0, 0, 0);
      start.setHours(Math.ceil(start.getHours() / TICK_EVERY_H) * TICK_EVERY_H);
      for (let t = start.getTime() / 1000; t < to - HOUR; t += TICK_EVERY_H * HOUR) {
        const x = xAt(t);
        if (x > w * 0.45 && x < w - 24) ticks.push({ x, label: hourLabel(t) });
      }
    }

    return { areaPath, linePath, points, peak, peakAnchor, ticks, labelSize, h };
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
    transition: `opacity var(--duration-state) var(--ease-morph)${delay ? " var(--duration-morph)" : ""}`,
  });

  return (
    <div ref={containerRef} class="h-full w-full">
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
                <linearGradient id="spark-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color={color()} stop-opacity="0.32" />
                  <stop offset="100%" stop-color={color()} stop-opacity="0" />
                </linearGradient>
              </defs>

              <path
                d={cd().areaPath}
                fill="url(#spark-area)"
                opacity={mounted() ? 1 : 0}
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
                style={{ transition: "stroke-dashoffset var(--duration-morph) var(--ease-morph)" }}
              />

              <text
                x={cd().peak.x}
                y={cd().peak.y - 8}
                text-anchor={cd().peakAnchor}
                fill="var(--muted-foreground)"
                font-size={`${cd().labelSize}`}
                font-weight="600"
                opacity={mounted() ? 1 : 0}
                style={reveal(true)}
              >
                <tspan fill="var(--foreground)">{fmt(cd().peak.value)}</tspan>
                {` · ${hourLabel(cd().peak.timestamp)}`}
              </text>

              <For each={cd().ticks}>
                {(tick) => (
                  <text
                    x={tick.x}
                    y={cd().h - 6}
                    text-anchor="middle"
                    fill="var(--muted-foreground)"
                    font-size={`${cd().labelSize * 0.85}`}
                    font-weight="500"
                    opacity={mounted() ? 0.8 : 0}
                    style={reveal(true)}
                  >
                    {tick.label}
                  </text>
                )}
              </For>
            </>
          )}
        </Show>
      </svg>
    </div>
  );
}
