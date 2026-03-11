import { createMemo, type JSX } from "solid-js";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline(props: SparklineProps): JSX.Element {
  const w = () => props.width ?? 100;
  const h = () => props.height ?? 40;
  const color = () => props.color ?? "currentColor";

  const paths = createMemo(() => {
    const data = props.data;
    if (data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const vw = w();
    const vh = h();
    const padding = 1;
    const drawH = vh - padding * 2;

    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * vw;
      const y = padding + drawH - ((v - min) / range) * drawH;
      return { x, y };
    });

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

    const areaPath = `${linePath} L${points[points.length - 1].x},${vh} L${points[0].x},${vh} Z`;

    return { linePath, areaPath };
  });

  return (
    <svg viewBox={`0 0 ${w()} ${h()}`} class="h-full w-full" preserveAspectRatio="none">
      {paths() && (
        <>
          <path d={paths()!.areaPath} fill={color()} opacity={0.2} />
          <path d={paths()!.linePath} fill="none" stroke={color()} stroke-width="1.5" />
        </>
      )}
    </svg>
  );
}
