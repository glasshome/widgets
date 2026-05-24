import { createMemo, For, Show } from "solid-js";
import type { AnalogOptions, AnalogPresetTheme, ClockSize } from "./types";

interface AnalogClockProps {
  date: Date;
  timeZone?: string;
  size: ClockSize;
  showSeconds: boolean;
  analogOptions?: AnalogOptions;
  presetTheme?: AnalogPresetTheme;
}

const defaultTheme: AnalogPresetTheme = {
  faceColor: "rgba(127, 127, 127, 0.08)",
  handColor: "rgb(59, 130, 246)",
  accentColor: "rgb(147, 51, 234)",
  tickColor: "currentColor",
};

const SIZE_MAP: Record<ClockSize, number> = {
  small: 120,
  medium: 160,
  large: 200,
};

export function AnalogClock(props: AnalogClockProps) {
  const theme = () => props.presetTheme ?? defaultTheme;
  const options = () => props.analogOptions ?? { border: false, ticks: "hour" as const };
  const border = () => options().border;
  const ticks = () => options().ticks;

  const clockSize = () => SIZE_MAP[props.size] ?? 120;
  const center = () => clockSize() / 2;
  const radius = () => clockSize() / 2 - 10;

  const timeComponents = createMemo(() => {
    const date = props.date;
    if (!props.timeZone) {
      return {
        hours: date.getHours() % 12,
        minutes: date.getMinutes(),
        seconds: date.getSeconds(),
      };
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: props.timeZone,
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hour = Number.parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
    const minute = Number.parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
    const second = Number.parseInt(parts.find((p) => p.type === "second")?.value || "0", 10);

    return { hours: hour % 12, minutes: minute, seconds: second };
  });

  const hourAngle = () => {
    const { hours, minutes } = timeComponents();
    return (hours * 30 + minutes * 0.5) % 360;
  };
  const minuteAngle = () => timeComponents().minutes * 6;
  const secondAngle = () => timeComponents().seconds * 6;

  const tickElements = createMemo(() => {
    const t = ticks();
    if (t === "none") return [];

    const tickCount = t === "minute" ? 60 : t === "quarter" ? 4 : 12;
    const tickLength = t === "minute" ? 2 : t === "quarter" ? 8 : 6;
    const tickWidth = t === "minute" ? 1 : 2;
    const r = radius();
    const c = center();

    return Array.from({ length: tickCount }, (_, i) => {
      const angle = ((i * 360) / tickCount - 90) * (Math.PI / 180);
      return {
        x1: c + (r - tickLength) * Math.cos(angle),
        y1: c + (r - tickLength) * Math.sin(angle),
        x2: c + r * Math.cos(angle),
        y2: c + r * Math.sin(angle),
        width: tickWidth,
      };
    });
  });

  const handEnd = (angle: number, length: number) => {
    const rad = (angle - 90) * (Math.PI / 180);
    const r = radius();
    return { x: r * length * Math.cos(rad), y: r * length * Math.sin(rad) };
  };

  return (
    <svg
      width={clockSize()}
      height={clockSize()}
      viewBox={`0 0 ${clockSize()} ${clockSize()}`}
      class="text-foreground/70 drop-shadow-lg"
    >
      <circle
        cx={center()}
        cy={center()}
        r={radius()}
        fill={theme().faceColor}
        stroke={border() ? theme().tickColor : "none"}
        stroke-width={border() ? 2 : 0}
      />

      <For each={tickElements()}>
        {(tick) => (
          <line
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={theme().tickColor}
            stroke-width={tick.width}
          />
        )}
      </For>

      <g transform={`translate(${center()}, ${center()})`}>
        {/* Hour hand */}
        <line
          x1="0"
          y1="0"
          x2={handEnd(hourAngle(), 0.5).x}
          y2={handEnd(hourAngle(), 0.5).y}
          stroke={theme().handColor}
          stroke-width="4"
          stroke-linecap="round"
        />

        {/* Minute hand */}
        <line
          x1="0"
          y1="0"
          x2={handEnd(minuteAngle(), 0.7).x}
          y2={handEnd(minuteAngle(), 0.7).y}
          stroke={theme().handColor}
          stroke-width="3"
          stroke-linecap="round"
        />

        {/* Second hand */}
        <Show when={props.showSeconds}>
          <line
            x1="0"
            y1="0"
            x2={handEnd(secondAngle(), 0.85).x}
            y2={handEnd(secondAngle(), 0.85).y}
            stroke={theme().accentColor}
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </Show>

        {/* Center dot */}
        <circle cx="0" cy="0" r="4" fill={theme().handColor} />
      </g>
    </svg>
  );
}
