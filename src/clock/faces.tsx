import { For, Show } from "solid-js";
import { Tile, TileHead } from "../common/tile/tile";
import "./faces.css";

interface FaceProps {
  hours: string;
  minutes: string;
  seconds: string;
  period?: string;
  weekday: string;
  date: string;
  showSeconds: boolean;
  showDate: boolean;
}

export function DigitalTile(props: FaceProps) {
  return (
    <Tile class="clock-tile">
      <Show when={props.showDate} fallback={<span />}>
        <TileHead eyebrow={props.weekday} name={props.date} />
      </Show>
      <div class="tile-hero">
        <span class="clock-time">
          {props.hours}:{props.minutes}
          <Show when={props.period}>
            <span class="clock-period">{props.period}</span>
          </Show>
        </span>
      </div>
    </Tile>
  );
}

const TICKS = Array.from({ length: 60 }, (_, i) => i);

export function AnalogTile(props: FaceProps) {
  const h = () => Number(props.hours) % 12;
  const m = () => Number(props.minutes);
  const s = () => Number(props.seconds);
  const hourAngle = () => (h() + m() / 60) * 30;
  const minuteAngle = () => (m() + s() / 60) * 6;
  const secondAngle = () => s() * 6;

  return (
    <Tile class="clock-tile clock-analog-tile">
      <div class="clock-analog">
        <svg viewBox="0 0 100 100" role="img" aria-label={`${props.hours}:${props.minutes}`}>
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="color-mix(in oklch, var(--color-foreground) 5%, transparent)"
            stroke="color-mix(in oklch, var(--color-foreground) 10%, transparent)"
            stroke-width="0.6"
          />
          <For each={TICKS}>
            {(i) => (
              <line
                x1="50"
                y1={i % 5 === 0 ? 7 : 6}
                x2="50"
                y2={i % 5 === 0 ? 13 : 8.5}
                stroke={`color-mix(in oklch, var(--color-foreground) ${i % 5 === 0 ? 70 : 25}%, transparent)`}
                stroke-width={i % 5 === 0 ? 1.8 : 0.8}
                stroke-linecap="round"
                transform={`rotate(${i * 6} 50 50)`}
              />
            )}
          </For>
          <line
            x1="50"
            y1="54"
            x2="50"
            y2="27"
            stroke="var(--color-foreground)"
            stroke-width="4"
            stroke-linecap="round"
            transform={`rotate(${hourAngle()} 50 50)`}
          />
          <line
            x1="50"
            y1="56"
            x2="50"
            y2="16"
            stroke="var(--color-foreground)"
            stroke-width="2.6"
            stroke-linecap="round"
            transform={`rotate(${minuteAngle()} 50 50)`}
          />
          <Show when={props.showSeconds}>
            <line
              x1="50"
              y1="60"
              x2="50"
              y2="12"
              stroke="var(--primary)"
              stroke-width="1"
              stroke-linecap="round"
              transform={`rotate(${secondAngle()} 50 50)`}
            />
          </Show>
          <circle cx="50" cy="50" r="2.6" fill="var(--primary)" />
        </svg>
        <div class="clock-analog-text">
          <Show when={props.showDate}>
            <span class="tile-eyebrow">{props.weekday}</span>
            <span class="tile-name">{props.date}</span>
          </Show>
          <span class="clock-time">
            {props.hours}:{props.minutes}
          </span>
        </div>
      </div>
    </Tile>
  );
}
