import { createMemo, createSignal, For, onCleanup, onMount } from "solid-js";
import { formatTemp } from "./utils";

interface ForecastChartProps {
  data: { temp: number; time: string }[];
  height?: number;
}

/** Monotone cubic Hermite spline — no overshoot between data points */
function monotoneCubicPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  if (points.length === 2)
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  const n = points.length;
  const dx: number[] = [];
  const dy: number[] = [];
  const m: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x);
    dy.push(points[i + 1].y - points[i].y);
    m.push(dy[i] / dx[i]);
  }

  const tangents: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      tangents.push(0);
    } else {
      tangents.push(
        (3 * (dx[i - 1] + dx[i])) /
          ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]),
      );
    }
  }
  tangents.push(m[n - 2]);

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const seg = dx[i] / 3;
    d += ` C ${points[i].x + seg} ${points[i].y + tangents[i] * seg}, ${points[i + 1].x - seg} ${points[i + 1].y - tangents[i + 1] * seg}, ${points[i + 1].x} ${points[i + 1].y}`;
  }
  return d;
}

function formatHour(datetime: string): string {
  try {
    return new Date(datetime)
      .toLocaleTimeString(undefined, { hour: "numeric", hour12: true })
      .replace(" ", "");
  } catch {
    return "";
  }
}

export function ForecastChart(props: ForecastChartProps) {
  const totalHeight = () => props.height ?? 90;
  const timeRowHeight = 18;
  const svgHeight = () => totalHeight() - timeRowHeight;
  const topPad = 16;
  const sidePad = 0;
  const labelMargin = 14;

  let containerRef!: HTMLDivElement;
  const [width, setWidth] = createSignal(0);
  const [mounted, setMounted] = createSignal(false);

  onMount(() => {
    setWidth(containerRef.clientWidth);
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (Math.abs(w - width()) > 1) setWidth(w);
    });
    ro.observe(containerRef);
    onCleanup(() => ro.disconnect());
    requestAnimationFrame(() => setMounted(true));
  });

  const chartData = createMemo(() => {
    const data = props.data;
    const w = width();
    if (data.length < 2 || w === 0) return null;

    const h = svgHeight();
    const drawHeight = h - topPad - 4;
    const drawWidth = w - sidePad * 2;

    const temps = data.map((d) => d.temp);
    const rawMin = Math.min(...temps);
    const rawMax = Math.max(...temps);
    const minRange = 4;
    const rawRange = rawMax - rawMin;
    const pad = rawRange < minRange ? (minRange - rawRange) / 2 : 0;
    const min = rawMin - pad;
    const range = (rawMax + pad) - min;

    const points = data.map((d, i) => ({
      x: sidePad + (i / (data.length - 1)) * drawWidth,
      y: topPad + drawHeight - ((d.temp - min) / range) * drawHeight,
      temp: d.temp,
    }));

    const linePath = monotoneCubicPath(points);
    // Area extends edge-to-edge at the bottom for a clean fill
    const areaPath = `M 0 ${h} L ${points[0].x} ${points[0].y} ${linePath.slice(linePath.indexOf("C"))} L ${w} ${h} Z`;

    // Time + temp markers share same indices so x-positions line up exactly
    const midIdx = Math.round((data.length - 1) / 2);
    const lastIdx = data.length - 1;

    type Anchor = "start" | "middle" | "end";
    const clampX = (x: number) => Math.max(labelMargin, Math.min(w - labelMargin, x));
    const timeMarkers: { label: string; x: number; anchor: Anchor }[] = [
      { label: "Now", x: clampX(points[0].x), anchor: "start" },
    ];
    if (midIdx > 0 && midIdx < lastIdx) {
      timeMarkers.push({
        label: formatHour(data[midIdx].time),
        x: clampX(points[midIdx].x),
        anchor: "middle",
      });
    }
    timeMarkers.push({
      label: formatHour(data[lastIdx].time),
      x: clampX(points[lastIdx].x),
      anchor: "end",
    });

    const tempMarkers: { idx: number; anchor: Anchor }[] = [];
    if (midIdx > 0 && midIdx < lastIdx) tempMarkers.push({ idx: midIdx, anchor: "middle" });
    tempMarkers.push({ idx: lastIdx, anchor: "end" });

    return { areaPath, linePath, points, w, h, timeMarkers, tempMarkers };
  });

  const pathLength = createMemo(() => {
    const cd = chartData();
    if (!cd) return 0;
    const pts = cd.points;
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return Math.ceil(len);
  });

  const labelPos = (idx: number) => {
    const cd = chartData();
    if (!cd) return { x: 0, y: 0 };
    const p = cd.points[idx];
    const x = Math.max(labelMargin, Math.min(cd.w - labelMargin, p.x));
    return { x, y: p.y };
  };

  return (
    <div ref={containerRef} class="relative w-full" style={{ height: `${totalHeight()}px` }}>
      <svg
        width={width()}
        height={svgHeight()}
        viewBox={`0 0 ${width()} ${svgHeight()}`}
        class="block"
      >
        {chartData() && (
          <>
            <defs>
              <linearGradient id="fc-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="currentColor" stop-opacity="0.35" />
                <stop offset="70%" stop-color="currentColor" stop-opacity="0.08" />
                <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
              </linearGradient>
            </defs>

            {/* Area fill */}
            <path
              d={chartData()!.areaPath}
              fill="url(#fc-area)"
              opacity={mounted() ? 1 : 0}
              style={{ transition: "opacity 0.6s ease-out" }}
            />

            {/* Line */}
            <path
              d={chartData()!.linePath}
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              opacity="0.9"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-dasharray={`${pathLength()}`}
              stroke-dashoffset={mounted() ? 0 : pathLength()}
              style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
            />

            {/* "Now" dot with glow */}
            <circle
              cx={chartData()!.points[0].x}
              cy={chartData()!.points[0].y}
              r="6"
              fill="currentColor"
              opacity={mounted() ? 0.15 : 0}
              style={{ transition: "opacity 0.3s ease-out 0.6s" }}
            />
            <circle
              cx={chartData()!.points[0].x}
              cy={chartData()!.points[0].y}
              r="3"
              fill="currentColor"
              opacity={mounted() ? 1 : 0}
              style={{ transition: "opacity 0.3s ease-out 0.6s" }}
            />

            {/* Temp labels above curve at time-marker positions */}
            <For each={chartData()!.tempMarkers}>
              {(tm) => (
                <text
                  x={labelPos(tm.idx).x}
                  y={labelPos(tm.idx).y - 6}
                  text-anchor={tm.anchor}
                  fill="currentColor"
                  font-size="11"
                  font-weight="600"
                  opacity={mounted() ? 0.9 : 0}
                  style={{ transition: "opacity 0.3s ease-out 0.7s" }}
                >
                  {formatTemp(chartData()!.points[tm.idx].temp)}
                </text>
              )}
            </For>
          </>
        )}
      </svg>

      {/* Time labels — HTML for crisp rendering, no SVG clamping issues */}
      {chartData() && (
        <div
          class="relative w-full"
          style={{
            height: `${timeRowHeight}px`,
            opacity: mounted() ? 0.7 : 0,
            transition: "opacity 0.4s ease-out 0.8s",
          }}
        >
          <For each={chartData()!.timeMarkers}>
            {(marker) => {
              const translate =
                marker.anchor === "start"
                  ? "0%"
                  : marker.anchor === "end"
                    ? "-100%"
                    : "-50%";
              return (
                <span
                  class="absolute text-[10px] leading-none whitespace-nowrap"
                  style={{
                    left: `${marker.x}px`,
                    transform: `translateX(${translate})`,
                  }}
                >
                  {marker.label}
                </span>
              );
            }}
          </For>
        </div>
      )}
    </div>
  );
}
