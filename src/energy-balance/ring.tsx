import { svgColors } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { For, type JSX, Show } from "solid-js";
import { energyIcons, formatPower } from "../_energy-shared";

const AMBER = svgColors.solar.solid;
const BLUE = svgColors.grid.solid;

export type ValueUnit = "W" | "kWh";

// Undulating liquid surface at the top of a fill: two wave layers scrolling at
// different speeds. The crest/trough pattern repeats every 100 units, so a -100
// translate (over a path that spans 0…200) loops seamlessly with no jump.
function WaveTop(props: { color: string; speed: number }): JSX.Element {
  const wave = "M0,12 Q25,6 50,12 T100,12 T150,12 T200,12 V20 H0 Z";
  return (
    <div class="pointer-events-none absolute inset-x-0 top-0 h-3 -translate-y-2 overflow-hidden">
      <svg class="absolute left-0 h-3 w-[200%]" viewBox="0 0 200 20" preserveAspectRatio="none">
        <path d={wave} fill={props.color} opacity="0.5">
          <animateTransform attributeName="transform" type="translate" from="0 0" to="-100 0" dur={`${props.speed * 2.6}s`} repeatCount="indefinite" />
        </path>
        <path d={wave} fill={props.color}>
          <animateTransform attributeName="transform" type="translate" from="0 0" to="-100 0" dur={`${props.speed * 1.8}s`} repeatCount="indefinite" />
        </path>
      </svg>
    </div>
  );
}

// ── Compact tier: a center-anchored diverging bar ──────────────────────────

interface BarProps {
  produced: number;
  consumed: number;
  unit: ValueUnit;
  /** -1 (home outweighs) … 0 (balanced) … +1 (solar surplus). */
  balance: number;
  reducedMotion: boolean;
}

function fmtEnd(value: number, unit: ValueUnit): JSX.Element {
  if (unit === "W") return <>{formatPower(value)}</>;
  return (
    <>
      {value.toFixed(1)}
      <span class="text-[10px] opacity-70">kWh</span>
    </>
  );
}

/**
 * Compact tier: home use on the left, solar made on the right (same poles as
 * the columns). The fill diverges from the balanced centre toward whichever
 * outweighs; surplus fills amber to the right, a shortfall blue to the left.
 */
export function BalanceBar(props: BarProps): JSX.Element {
  const b = () => Math.max(-1, Math.min(1, props.balance));
  const surplus = () => b() > 0;
  const mag = () => Math.abs(b()) * 50;
  const color = () => (surplus() ? AMBER : BLUE);
  const move = () =>
    props.reducedMotion ? "none" : "left 500ms cubic-bezier(0.22, 1, 0.36, 1), width 500ms cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <div class="w-full">
      <div class="mb-2 flex items-center justify-between text-xs tabular-nums">
        <span class="flex items-center gap-1.5" style={{ color: BLUE }}>
          <Icon icon={energyIcons.home} style={{ "font-size": "14px" }} />
          {fmtEnd(props.consumed, props.unit)}
        </span>
        <span class="flex items-center gap-1.5" style={{ color: AMBER }}>
          {fmtEnd(props.produced, props.unit)}
          <Icon icon={energyIcons.solar} style={{ "font-size": "14px" }} />
        </span>
      </div>
      <div
        class="relative h-3.5 w-full rounded-full"
        style={{ background: "color-mix(in oklch, currentColor 10%, transparent)" }}
      >
        <div
          class="-translate-x-1/2 absolute inset-y-[-3px] left-1/2 w-px rounded-full"
          style={{ background: "color-mix(in oklch, currentColor 38%, transparent)" }}
        />
        <div
          class={`absolute inset-y-0 ${surplus() ? "rounded-r-full" : "rounded-l-full"}`}
          style={{
            left: surplus() ? "50%" : `${50 - mag()}%`,
            width: `${mag()}%`,
            background: color(),
            "box-shadow": `0 0 10px color-mix(in oklch, ${color()} 55%, transparent)`,
            transition: move(),
          }}
        />
      </div>
    </div>
  );
}

// ── Full tier: two columns comparing what solar made vs what home used ──────

interface ColumnsProps {
  produced: number;
  consumed: number;
  unit: ValueUnit;
  reducedMotion: boolean;
}

/**
 * Two thick columns risen to the day's kWh on a shared scale, so the taller
 * bar is the bigger side and the height gap between them is the surplus (or,
 * when home is taller, the shortfall). A light rises inside each to read as
 * energy; suppressed under reduced motion.
 */
export function EnergyColumns(props: ColumnsProps): JSX.Element {
  const max = () => Math.max(props.produced, props.consumed, 0.1);
  const cols = () => [
    { label: "Solar", value: props.produced, color: AMBER, icon: energyIcons.solar },
    { label: "Home", value: props.consumed, color: BLUE, icon: energyIcons.home },
  ];
  return (
    <div class="flex h-full w-full items-stretch justify-center gap-4">
      <For each={cols()}>
        {(c) => {
          const frac = () => c.value / max();
          // More energy → quicker flow.
          const speed = () => Math.max(1, 2.4 - frac() * 1.4);
          return (
            <div class="flex min-h-0 min-w-0 max-w-[72px] flex-1 flex-col items-center">
              <div
                class="relative min-h-0 w-full flex-1 overflow-hidden rounded-lg"
                style={{ background: "color-mix(in oklch, currentColor 8%, transparent)" }}
              >
                {/* Fill (colour + waves only). */}
                <div
                  class="absolute inset-x-0 bottom-0 rounded-b-lg"
                  style={{
                    height: `${frac() * 100}%`,
                    background: c.color,
                    "box-shadow": `0 0 14px color-mix(in oklch, ${c.color} 45%, transparent)`,
                    transition: props.reducedMotion ? "none" : "height 600ms cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  <Show when={!props.reducedMotion}>
                    <WaveTop color={c.color} speed={speed()} />
                  </Show>
                </div>
                {/* Scrim + number pinned to the track bottom so they stay put
                    even when the fill is empty (e.g. solar at night). */}
                <div
                  class="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-lg"
                  style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.45), transparent)" }}
                />
                {/* Icon + label centered in the bar; neutral white + a soft
                    shadow so they stay legible over the fill and the dark track. */}
                <div
                  class="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-1/2 left-1/2 z-10 flex flex-col items-center gap-1 text-foreground"
                  style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}
                >
                  <Icon icon={c.icon} style={{ "font-size": "26px" }} />
                  <span class="font-medium text-xs">{c.label}</span>
                </div>
                <span
                  class="absolute inset-x-0 bottom-3 px-0.5 text-center font-semibold text-[13px] text-white leading-none tabular-nums"
                  style={{ "text-shadow": "0 1px 3px rgba(0,0,0,0.5)" }}
                >
                  <Show
                    when={props.unit === "W"}
                    fallback={
                      <>
                        {c.value.toFixed(1)}
                        <span class="ml-0.5 font-normal text-[9px] opacity-85">kWh</span>
                      </>
                    }
                  >
                    {formatPower(c.value)}
                  </Show>
                </span>
              </div>
            </div>
          );
        }}
      </For>
    </div>
  );
}
