import { createMemo } from "solid-js";
import { formatTemp } from "./utils";

interface ForecastChartProps {
  data: { temp: number; time: string }[];
  height?: number;
}

export function ForecastChart(props: ForecastChartProps) {
  const height = () => props.height ?? 60;
  const padding = 4;
  const labelPadding = 14;

  const pathData = createMemo(() => {
    const data = props.data;
    if (data.length < 2) return null;

    const viewWidth = 100;
    const viewHeight = height();
    const chartTop = labelPadding;
    const chartHeight = viewHeight - labelPadding * 2;

    const temps = data.map((d) => d.temp);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const range = max - min || 1;

    const points = data.map((d, i) => ({
      x: padding + (i / (data.length - 1)) * (viewWidth - padding * 2),
      y: chartTop + chartHeight - ((d.temp - min) / range) * chartHeight,
      temp: d.temp,
    }));

    // SVG area path
    const linePoints = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPath = `${linePoints} L ${points[points.length - 1].x} ${viewHeight} L ${points[0].x} ${viewHeight} Z`;
    const linePath = linePoints;

    // Find min/max indices for labels
    let minIdx = 0;
    let maxIdx = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].temp < points[minIdx].temp) minIdx = i;
      if (points[i].temp > points[maxIdx].temp) maxIdx = i;
    }

    return { areaPath, linePath, points, minIdx, maxIdx, viewWidth, viewHeight };
  });

  return (
    <svg
      viewBox={`0 0 100 ${height()}`}
      preserveAspectRatio="none"
      class="w-full"
      style={{ height: `${height()}px` }}
    >
      {pathData() && (
        <>
          <path d={pathData()!.areaPath} fill="currentColor" opacity="0.15" />
          <path
            d={pathData()!.linePath}
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            opacity="0.6"
          />
          {/* Min label */}
          <text
            x={pathData()!.points[pathData()!.minIdx].x}
            y={pathData()!.points[pathData()!.minIdx].y + 10}
            text-anchor="middle"
            fill="currentColor"
            font-size="7"
            opacity="0.8"
          >
            {formatTemp(pathData()!.points[pathData()!.minIdx].temp)}
          </text>
          {/* Max label */}
          <text
            x={pathData()!.points[pathData()!.maxIdx].x}
            y={pathData()!.points[pathData()!.maxIdx].y - 4}
            text-anchor="middle"
            fill="currentColor"
            font-size="7"
            opacity="0.8"
          >
            {formatTemp(pathData()!.points[pathData()!.maxIdx].temp)}
          </text>
        </>
      )}
    </svg>
  );
}
