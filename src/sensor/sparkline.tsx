import { monotoneCubicPath } from "@glasshome/widget-sdk";
import { createMemo, createSignal, type JSX, onCleanup, onMount, Show } from "solid-js";

export interface SparklinePoint {
  value: number;
  timestamp: number;
}

interface SparklineProps {
  data: SparklinePoint[];
  color?: string;
}

export function Sparkline(props: SparklineProps): JSX.Element {
  const color = () => props.color ?? "var(--widget-color)";
  const fmt = (v: number) => {
    // Compact label: drop decimals for large values, 1 decimal for small
    if (Math.abs(v) >= 100) return Math.round(v).toString();
    if (Math.abs(v) >= 10) return v.toFixed(1).replace(/\.0$/, "");
    return v.toFixed(1);
  };

  const labelPad = 6;
  const topPad = 18;

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

    const drawH = (h - topPad) * 0.8;

    const values = data.map((d) => d.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const minRange = (rawMax + rawMin) * 0.05 || 1;
    const rawRange = rawMax - rawMin;
    const pad = rawRange < minRange ? (minRange - rawRange) / 2 : 0;
    const min = rawMin - pad;
    const range = rawMax + pad - min;

    const points = data.map((d, i) => ({
      x: (i / (data.length - 1)) * w,
      y: topPad + drawH - ((d.value - min) / range) * drawH,
      value: d.value,
    }));

    const linePath = monotoneCubicPath(points);
    const areaPath = `M 0 ${h} L ${points[0].x} ${points[0].y} ${linePath.slice(linePath.indexOf("C"))} L ${w} ${h} Z`;

    let maxIdx = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].value > points[maxIdx].value) maxIdx = i;
    }

    const clampX = (x: number) => Math.max(labelPad, Math.min(w - labelPad, x));
    const anchor = (x: number) => {
      if (x < labelPad + 18) return "start";
      if (x > w - labelPad - 18) return "end";
      return "middle";
    };

    return { areaPath, linePath, points, maxIdx, clampX, anchor, h };
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
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-dasharray={`${pathLength()}`}
                stroke-dashoffset={mounted() ? 0 : pathLength()}
                style={{ transition: "stroke-dashoffset var(--duration-morph) var(--ease-morph)" }}
              />

              <text
                x={cd().clampX(cd().points[cd().maxIdx].x)}
                y={cd().points[cd().maxIdx].y - 4}
                text-anchor={cd().anchor(cd().points[cd().maxIdx].x)}
                fill="var(--muted-foreground)"
                font-size="11"
                font-weight="600"
                opacity={mounted() ? 0.9 : 0}
                style={{
                  transition:
                    "opacity var(--duration-state) var(--ease-morph) var(--duration-morph)",
                }}
              >
                {fmt(cd().points[cd().maxIdx].value)}{" "}
              </text>
            </>
          )}
        </Show>
      </svg>
    </div>
  );
}
