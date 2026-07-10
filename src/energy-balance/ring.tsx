import { svgColors } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { For, type JSX, Show } from "solid-js";
import { energyIcons } from "../_energy-shared";

const AMBER = svgColors.solar.solid;
const BLUE = svgColors.grid.solid;

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
  /** -1 (drawing from grid) … 0 (balanced) … +1 (producing surplus). */
  balance: number;
  reducedMotion: boolean;
}

export function BalanceBar(props: BarProps): JSX.Element {
  const b = () => Math.max(-1, Math.min(1, props.balance));
  const surplus = () => b() > 0;
  const mag = () => Math.abs(b()) * 50;
  const color = () => (surplus() ? AMBER : BLUE);
  const move = () =>
    props.reducedMotion ? "none" : "left 500ms cubic-bezier(0.22, 1, 0.36, 1), width 500ms cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <div class="w-full">
      <div class="mb-2 flex items-end justify-between text-[10px] leading-none">
        <span style={{ color: BLUE }}>grid</span>
        <span class="text-muted-foreground">balanced</span>
        <span style={{ color: AMBER }}>solar</span>
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
          class="absolute inset-y-0 rounded-full"
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
  producedKWh: number;
  consumedKWh: number;
  reducedMotion: boolean;
}

/**
 * Two thick columns risen to the day's kWh on a shared scale, so the taller
 * bar is the bigger side and the height gap between them is the surplus (or,
 * when home is taller, the shortfall). A light rises inside each to read as
 * energy; suppressed under reduced motion.
 */
export function EnergyColumns(props: ColumnsProps): JSX.Element {
  const max = () => Math.max(props.producedKWh, props.consumedKWh, 0.1);
  const cols = () => [
    { label: "Solar", value: props.producedKWh, color: AMBER, icon: energyIcons.solar },
    { label: "Home", value: props.consumedKWh, color: BLUE, icon: energyIcons.home },
  ];
  return (
    <div class="flex h-full w-full items-stretch justify-center gap-4">
      <For each={cols()}>
        {(c) => {
          const frac = () => c.value / max();
          // More energy → quicker flow.
          const speed = () => Math.max(1, 2.4 - frac() * 1.4);
          return (
            <div class="flex min-h-0 min-w-0 max-w-[64px] flex-1 flex-col items-center gap-2">
              <div
                class="relative min-h-0 w-full flex-1 overflow-hidden rounded-lg"
                style={{ background: "color-mix(in oklch, currentColor 8%, transparent)" }}
              >
                <div
                  class="absolute inset-x-0 bottom-0 flex flex-col justify-end rounded-b-lg"
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
                  {/* Dark scrim so the white number reads on any fill colour. */}
                  <div
                    class="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-lg"
                    style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.45), transparent)" }}
                  />
                  <span
                    class="relative z-10 truncate px-1 pb-1.5 text-center font-semibold text-white text-sm leading-none tabular-nums"
                    style={{ "text-shadow": "0 1px 3px rgba(0,0,0,0.5)" }}
                  >
                    {c.value.toFixed(1)}
                    <span class="ml-0.5 font-normal text-[10px] opacity-85">kWh</span>
                  </span>
                </div>
              </div>
              <span class="flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
                <Icon icon={c.icon} style={{ color: c.color, "font-size": "14px", "flex-shrink": "0" }} />
                <span class="truncate">{c.label}</span>
              </span>
            </div>
          );
        }}
      </For>
    </div>
  );
}
