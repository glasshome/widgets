import { Icon, type WeatherForecast } from "@glasshome/widget-sdk";
import { createMemo, For, Show } from "solid-js";
import { skyChanges, smoothPath, tempColor } from "./forecast";
import { ambientLoop, formatTemp, getWeatherIcon, hourName } from "./utils";

const RAIN_DEPTHS = [
  { name: "far", columns: 3, period: 13, length: 4, seconds: 1.37, salt: 12.9898 },
  { name: "near", columns: 2, period: 21, length: 8, seconds: 0.89, salt: 4.1414 },
];

const EMPTY_HOUR: WeatherForecast = { datetime: "" };

/**
 * The next hours as the shape of the day: a curve rising from the bottom edge, temperatures
 * along it, an icon only where the sky changes, rain chance as a blue tint under the line.
 */
export function HourChart(props: { hours: WeatherForecast[]; labelEvery: number }) {
  const range = createMemo(() => {
    const temps = props.hours.map((h) => h.temperature ?? 0);
    const min = Math.min(...temps);
    return { min, span: Math.max(3, Math.max(...temps) - min) };
  });
  const x = (i: number) => 4 + (i / Math.max(1, props.hours.length - 1)) * 92;
  const y = (t: number) => 66 - ((t - range().min) / range().span) * 22;
  const line = () => smoothPath(props.hours.map((h, i) => ({ x: x(i), y: y(h.temperature ?? 0) })));
  // Rain falls under the line in two depths; each column repeats every `period` so the loop is seamless.
  const drops = createMemo(() => {
    const step = 92 / Math.max(1, props.hours.length - 1);
    return RAIN_DEPTHS.map((depth) => ({
      ...depth,
      lines: props.hours.flatMap((h, i) => {
        const chance = h.precipitation_probability ?? 0;
        const columns = Math.round((Math.max(0, chance - 10) / 90) * depth.columns);
        const top = y(h.temperature ?? 0) - depth.period;
        return Array.from({ length: columns }, (_, k) => {
          const r = Math.abs(Math.sin((i + 1) * depth.salt + k * 78.233) * 43758.5453) % 1;
          const r2 = Math.abs(Math.sin((i + 1) * 3.117 + k * depth.salt) * 24634.634) % 1;
          const x0 = x(i) + (r - 0.5) * step;
          const out: { x: number; y: number }[] = [];
          for (let y0 = top + r2 * depth.period; y0 < 100; y0 += depth.period)
            out.push({ x: x0, y: y0 });
          return out;
        }).flat();
      }),
    }));
  });
  // Drops show only under the line, fading down: a static mask, so the drops themselves only slide.
  const dropMask = createMemo(() => {
    const area = `${line()}L${x(props.hours.length - 1)},100L${x(0)},100Z`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="f" x1="0" x2="0" y1="0" y2="1"><stop offset="0.35" stop-color="white"/><stop offset="0.95" stop-color="white" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#f)"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  });
  const edge = (i: number) =>
    i === 0 ? "start" : i === props.hours.length - 1 ? "end" : undefined;
  const labelled = (i: number) => {
    const every = props.labelEvery;
    const last = props.hours.length - 1;
    return i % every === 0 || (i === last && i % every > every / 2);
  };
  // Icons ride on the labelled hours only, so a sky that flips every hour cannot crowd the labels.
  const labelledHours = createMemo(() => props.hours.flatMap((_, i) => (labelled(i) ? [i] : [])));
  const changes = createMemo(() => {
    const marked = labelledHours();
    return new Set(
      skyChanges(marked.map((i) => props.hours[i] ?? EMPTY_HOUR)).map((k) => marked[k]),
    );
  });

  return (
    <div class="wx-chart" role="img" aria-label="Temperature over the next hours">
      <div class="wx-drops-box" style={{ "mask-image": dropMask() }}>
        <For each={drops()}>
          {(depth) => {
            const loop = ambientLoop(depth.seconds);
            return (
              <div
                class="wx-chart-drops"
                data-depth={depth.name}
                style={{
                  "--wx-drop-p": `${depth.period}%`,
                  "--wx-drop-t": `${loop.seconds}s`,
                  "--wx-steps": loop.steps,
                }}
              >
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <For each={depth.lines}>
                    {(d) => (
                      <line
                        x1={d.x}
                        y1={d.y}
                        x2={d.x - depth.length * 0.09}
                        y2={d.y + depth.length}
                      />
                    )}
                  </For>
                </svg>
              </div>
            );
          }}
        </For>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient
            id="wx-chart-ink"
            gradientUnits="userSpaceOnUse"
            x1="0"
            x2="100"
            y1="0"
            y2="0"
          >
            <For keyed={false} each={props.hours}>
              {(h, i) => <stop offset={x(i) / 100} stop-color={tempColor(h().temperature ?? 0)} />}
            </For>
          </linearGradient>
          <linearGradient id="wx-chart-fade" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stop-color="white" stop-opacity="0" />
            <stop offset="0.08" stop-color="white" />
            <stop offset="0.92" stop-color="white" />
            <stop offset="1" stop-color="white" stop-opacity="0" />
          </linearGradient>
          <mask id="wx-chart-ends" maskContentUnits="objectBoundingBox">
            <rect width="1" height="1" fill="url(#wx-chart-fade)" />
          </mask>
          <linearGradient id="wx-chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stop-color="var(--foreground)" stop-opacity="0.1" />
            <stop offset="1" stop-color="var(--foreground)" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${line()}L${x(props.hours.length - 1)},100L${x(0)},100Z`}
          fill="url(#wx-chart-fill)"
          mask="url(#wx-chart-ends)"
        />
        <path d={line()} class="wx-chart-halo" />
        <path d={line()} class="wx-chart-line" stroke="url(#wx-chart-ink)" />
      </svg>
      <For each={labelledHours()}>
        {(i) => {
          const h = () => props.hours[i] ?? EMPTY_HOUR;
          return (
            <>
              <span
                class="wx-chart-point"
                data-edge={edge(i)}
                data-now={i === 0 ? "true" : undefined}
                style={{
                  left: `${x(i)}%`,
                  top: `${y(h().temperature ?? 0)}%`,
                  "--wx-bead": tempColor(h().temperature ?? 0),
                }}
              >
                <span class="wx-chart-callout">
                  <Show when={changes().has(i)}>
                    <Icon icon={getWeatherIcon(h().condition ?? "cloudy")} class="wx-icon" />
                  </Show>
                  <span class="wx-temp">{formatTemp(h().temperature ?? 0)}</span>
                </span>
              </span>
              <span class="wx-chart-time wx-label" data-edge={edge(i)} style={{ left: `${x(i)}%` }}>
                {hourName(h().datetime, i)}
              </span>
            </>
          );
        }}
      </For>
    </div>
  );
}
