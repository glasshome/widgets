import { createMemo, createSignal, type JSX, onCleanup, onMount } from "solid-js";

export interface SparklinePoint {
  value: number;
  timestamp: number;
}

interface SparklineProps {
  data: SparklinePoint[];
  color?: string;
}

/** Monotone cubic Hermite spline — no overshoot between data points */
function monotoneCubicPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

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

export function Sparkline(props: SparklineProps): JSX.Element {
  const color = () => props.color ?? "currentColor";
  const fmt = (v: number) => {
    // Compact label: drop decimals for large values, 1 decimal for small
    if (Math.abs(v) >= 100) return Math.round(v).toString();
    if (Math.abs(v) >= 10) return v.toFixed(1).replace(/\.0$/, "");
    return v.toFixed(1);
  };

  const sidePad = 10;
  const topPad = 14;

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
    const data = props.data;
    const w = width();
    const h = height();
    if (data.length < 2 || w === 0 || h === 0) return null;

    const drawH = h - topPad - 2;
    const drawW = w - sidePad * 2;

    const values = data.map((d) => d.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const minRange = (rawMax + rawMin) * 0.05 || 1;
    const rawRange = rawMax - rawMin;
    const pad = rawRange < minRange ? (minRange - rawRange) / 2 : 0;
    const min = rawMin - pad;
    const range = rawMax + pad - min;

    const points = data.map((d, i) => ({
      x: sidePad + (i / (data.length - 1)) * drawW,
      y: topPad + drawH - ((d.value - min) / range) * drawH,
      value: d.value,
    }));

    const linePath = monotoneCubicPath(points);
    const areaPath = `M 0 ${h} L ${points[0].x} ${points[0].y} ${linePath.slice(linePath.indexOf("C"))} L ${w} ${h} Z`;

    let minIdx = 0;
    let maxIdx = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].value < points[minIdx].value) minIdx = i;
      if (points[i].value > points[maxIdx].value) maxIdx = i;
    }

    const clampX = (x: number) => Math.max(sidePad + 2, Math.min(w - sidePad - 2, x));
    const anchor = (x: number) => {
      if (x < sidePad + 18) return "start";
      if (x > w - sidePad - 18) return "end";
      return "middle";
    };

    const showLow = minIdx !== maxIdx && Math.abs(points[minIdx].x - points[maxIdx].x) > 30;

    return { areaPath, linePath, points, minIdx, maxIdx, clampX, anchor, h, showLow };
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

  return (
    <div ref={containerRef} class="h-full w-full">
      <svg width={width()} height={height()} viewBox={`0 0 ${width()} ${height()}`} class="block">
        {chartData() && (
          <>
            <defs>
              <linearGradient id="spark-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color={color()} stop-opacity="0.3" />
                <stop offset="100%" stop-color={color()} stop-opacity="0" />
              </linearGradient>
            </defs>

            <path
              d={chartData()!.areaPath}
              fill="url(#spark-area)"
              opacity={mounted() ? 1 : 0}
              style={{ transition: "opacity 0.5s ease-out" }}
            />

            <path
              d={chartData()!.linePath}
              fill="none"
              stroke={color()}
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              opacity="0.8"
              stroke-dasharray={`${pathLength()}`}
              stroke-dashoffset={mounted() ? 0 : pathLength()}
              style={{ transition: "stroke-dashoffset 0.7s ease-out" }}
            />

            {/* High label */}
            <text
              x={chartData()!.clampX(chartData()!.points[chartData()!.maxIdx].x)}
              y={chartData()!.points[chartData()!.maxIdx].y - 4}
              text-anchor={chartData()!.anchor(chartData()!.points[chartData()!.maxIdx].x)}
              fill={color()}
              font-size="10"
              font-weight="600"
              opacity={mounted() ? 0.9 : 0}
              style={{ transition: "opacity 0.3s ease-out 0.6s" }}
            >
              {fmt(chartData()!.points[chartData()!.maxIdx].value)}{" "}
            </text>

            {/* Low label */}
            {chartData()!.showLow && (
              <text
                x={chartData()!.clampX(chartData()!.points[chartData()!.minIdx].x)}
                y={chartData()!.points[chartData()!.minIdx].y + 12}
                text-anchor={chartData()!.anchor(chartData()!.points[chartData()!.minIdx].x)}
                fill={color()}
                font-size="10"
                font-weight="600"
                opacity={mounted() ? 0.9 : 0}
                style={{ transition: "opacity 0.3s ease-out 0.6s" }}
              >
                {fmt(chartData()!.points[chartData()!.minIdx].value)}{" "}
              </text>
            )}
          </>
        )}
      </svg>
    </div>
  );
}
