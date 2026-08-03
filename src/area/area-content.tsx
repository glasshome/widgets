import { useWidgetDimensions, Widget } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, For, type JSX, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { AreaMetrics } from "./utils";

interface AreaContentProps {
  metrics: AreaMetrics;
  areaName: string;
  areaIcon: string;
  onToggleLights: () => void;
}

const AMBER = "oklch(0.82 0.16 85)";

// --- Status chip (top-right environment readout) ---

interface ChipDef {
  key: string;
  icon: string;
  label: string;
  color: string;
  title: string;
}

function StatusChip(props: ChipDef) {
  return (
    <span
      class="inline-flex items-center gap-1 rounded-full bg-foreground/[0.07] px-2 py-0.5 font-medium text-[11px] tabular-nums leading-none"
      style={{ color: props.color }}
      title={props.title}
    >
      <Icon icon={props.icon} width={12} />
      {props.label}
    </span>
  );
}

function buildChips(m: AreaMetrics): ChipDef[] {
  const chips: ChipDef[] = [];

  if (m.alertCount > 0) {
    chips.push({
      key: "alert",
      icon: "mdi:alert-circle",
      label: `${m.alertCount} alert${m.alertCount > 1 ? "s" : ""}`,
      color: "oklch(0.7 0.18 25)",
      title: "Safety alert active",
    });
  }
  if (m.coversTotal > 0) {
    const open = m.coversOpen;
    chips.push({
      key: "cover",
      icon: open > 0 ? "mdi:window-open-variant" : "mdi:window-closed-variant",
      label: open > 0 ? `${open} open` : "Closed",
      color: open > 0 ? "oklch(0.78 0.13 220)" : "var(--color-muted-foreground, #9ca3af)",
      title: open > 0 ? `${open} window/blind open` : "Windows closed",
    });
  }
  if (m.humidity !== null) {
    const h = m.humidity;
    const label = h < 30 ? "Dry" : h > 60 ? "Humid" : "Ideal";
    const color =
      h < 30 ? "oklch(0.8 0.13 70)" : h > 60 ? "oklch(0.78 0.13 230)" : "oklch(0.78 0.1 200)";
    chips.push({
      key: "hum",
      icon: "mdi:water-percent",
      label,
      color,
      title: `Humidity ${h.toFixed(0)}%`,
    });
  }
  if (m.co2 !== null) {
    const c = m.co2;
    const label = c >= 1000 ? "CO₂ high" : c >= 800 ? "CO₂ ok" : "CO₂ fresh";
    const color =
      c >= 1000 ? "oklch(0.7 0.18 25)" : c >= 800 ? "oklch(0.8 0.13 70)" : "oklch(0.78 0.12 150)";
    chips.push({
      key: "co2",
      icon: "mdi:molecule-co2",
      label,
      color,
      title: `CO₂ ${c.toFixed(0)} ppm`,
    });
  }
  if (m.hasMotion) {
    chips.push({
      key: "motion",
      icon: "mdi:motion-sensor",
      label: "Motion",
      color: "oklch(0.8 0.13 70)",
      title: "Motion detected",
    });
  } else if (m.hasPresence) {
    chips.push({
      key: "presence",
      icon: "mdi:account",
      label: "Occupied",
      color: "oklch(0.75 0.13 300)",
      title: "Presence detected",
    });
  }

  return chips;
}

// --- Status summary (the "on top" state line) ---

interface AreaStatus {
  label: string;
  color: string;
}

function buildStatus(m: AreaMetrics): AreaStatus {
  if (m.alertCount > 0) return { label: "Alert", color: "oklch(0.7 0.18 25)" };
  if (m.lightsOn > 0) return { label: `${m.lightsOn} on`, color: AMBER };
  if (m.hasMotion) return { label: "Motion", color: "oklch(0.8 0.13 70)" };
  if (m.hasPresence) return { label: "Occupied", color: "oklch(0.75 0.13 300)" };
  return { label: "All off", color: "var(--color-muted-foreground, #9ca3af)" };
}

function StatusBadge(props: { status: AreaStatus; compact?: boolean }) {
  return (
    <span
      class={`inline-flex shrink-0 items-center gap-1.5 font-medium tabular-nums leading-none ${
        props.compact ? "text-[10px]" : "text-xs"
      }`}
      style={{ color: props.status.color }}
    >
      <span
        class="inline-block size-1.5 rounded-full"
        style={{
          "background-color": props.status.color,
          "box-shadow": `0 0 6px ${props.status.color}`,
        }}
      />
      {props.status.label}
    </span>
  );
}

// --- Control tile (vertical capsule) ---

interface TileDef {
  key: string;
  glyph: string;
  label: string;
  value: string;
  sub?: string;
  /** 0-100 vertical fill; omit for no fill. */
  fill?: number;
  accent?: string;
  active?: boolean;
  onTap?: () => void;
}

function ControlTile(props: TileDef & { compact?: boolean; horizontal?: boolean }) {
  const interactive = () => !!props.onTap;
  const accent = () => props.accent ?? "var(--widget-color)";
  const tag = interactive() ? "button" : "div";

  // Fill grows upward in vertical tiles, rightward in horizontal ones.
  const fillStyle = (): JSX.CSSProperties => {
    const f = props.fill ?? 0;
    const grad = `color-mix(in oklch, ${accent()} 42%, transparent), color-mix(in oklch, ${accent()} 14%, transparent)`;
    return props.horizontal
      ? {
          background: `linear-gradient(to right, ${grad})`,
          "clip-path": `inset(0 ${100 - f}% 0 0)`,
        }
      : { background: `linear-gradient(to top, ${grad})`, "clip-path": `inset(${100 - f}% 0 0 0)` };
  };

  return (
    <Dynamic
      component={tag}
      type={interactive() ? "button" : undefined}
      class={`group relative flex min-w-0 flex-1 overflow-hidden rounded-lg border text-left transition-all ${
        props.horizontal ? "items-center gap-3" : "flex-col justify-end gap-1"
      } ${props.compact ? "p-2.5" : "p-3"} ${
        props.active ? "border-transparent" : "border-foreground/10 bg-foreground/[0.05]"
      } ${interactive() ? "cursor-pointer active:scale-[0.97]" : ""}`}
      style={
        props.active
          ? { "background-color": `color-mix(in oklch, ${accent()} 16%, transparent)` }
          : undefined
      }
      on:pointerdown={interactive() ? (e: PointerEvent) => e.stopPropagation() : undefined}
      on:pointerup={interactive() ? (e: PointerEvent) => e.stopPropagation() : undefined}
      on:click={props.onTap ? () => props.onTap?.() : undefined}
    >
      <Show when={props.fill !== undefined}>
        <div
          class="pointer-events-none absolute inset-0 transition-[clip-path] duration-300 ease-out"
          style={fillStyle()}
        />
      </Show>

      {/* glyph chip — top in vertical, left in horizontal */}
      <div
        class={`relative flex shrink-0 items-center justify-center rounded-full transition-colors ${
          props.horizontal ? "" : "mb-auto"
        } ${props.compact ? "h-7 w-7" : "h-9 w-9"} ${
          props.active
            ? "shadow-[0_0_14px_-2px_var(--tw-shadow-color)]"
            : interactive()
              ? "bg-foreground/10 text-foreground/55 group-hover:bg-foreground/[0.14]"
              : "bg-foreground/[0.07] text-foreground/45"
        }`}
        style={
          props.active
            ? {
                "background-color": accent(),
                color: "oklch(0.18 0.02 80)",
                "--tw-shadow-color": accent(),
              }
            : undefined
        }
      >
        <Icon icon={props.glyph} width={props.compact ? 15 : 18} />
      </div>

      {/* label + value */}
      <div class={`relative min-w-0 ${props.horizontal ? "flex-1" : ""}`}>
        <div
          class={`truncate font-medium text-foreground/45 ${props.compact ? "text-[10px]" : "text-xs"}`}
        >
          {props.label}
        </div>
        <div
          class={`truncate font-bold text-foreground tabular-nums leading-tight ${
            props.compact ? "text-base" : "text-xl"
          }`}
        >
          {props.value}
          <Show when={props.sub}>
            <span class="ml-1 font-medium text-foreground/40 text-xs">{props.sub}</span>
          </Show>
        </div>
      </div>
    </Dynamic>
  );
}

// --- Tile builder ---

function buildTiles(props: AreaContentProps): TileDef[] {
  const m = props.metrics;
  const tiles: TileDef[] = [];

  if (m.lightsTotal > 0) {
    const on = m.lightsOn > 0;
    tiles.push({
      key: "lights",
      glyph: on ? "mdi:lightbulb" : "mdi:lightbulb-outline",
      label: "Lights",
      value: `${m.lightsOn}/${m.lightsTotal}`,
      fill: (m.lightsOn / m.lightsTotal) * 100,
      accent: AMBER,
      active: on,
      onTap: props.onToggleLights,
    });
  }

  if (m.temperature !== null) {
    const t = m.temperature;
    const accent =
      t >= 26 ? "oklch(0.7 0.18 25)" : t <= 18 ? "oklch(0.78 0.13 230)" : "oklch(0.78 0.12 150)";
    tiles.push({
      key: "climate",
      glyph: "mdi:thermometer",
      label: "Climate",
      value: `${t.toFixed(1)}°`,
      sub: m.humidity !== null ? `${m.humidity.toFixed(0)}%` : undefined,
      accent,
    });
  }

  if (m.coversTotal > 0) {
    tiles.push({
      key: "covers",
      glyph: m.coversOpen > 0 ? "mdi:window-shutter-open" : "mdi:window-shutter",
      label: "Blinds",
      value: m.coversOpen > 0 ? "Open" : "Closed",
      sub: m.coversTotal > 1 ? `${m.coversOpen}/${m.coversTotal}` : undefined,
      accent: "oklch(0.78 0.13 220)",
    });
  }

  return tiles;
}

// --- Main content ---

export function AreaContent(props: AreaContentProps) {
  const dimensions = useWidgetDimensions();
  const chips = createMemo(() => buildChips(props.metrics));
  const tiles = createMemo(() => buildTiles(props));
  const status = createMemo(() => buildStatus(props.metrics));

  const isSmall = createMemo(() => {
    const d = dimensions();
    return d.width <= 300 || d.height <= 150;
  });
  const isLarge = createMemo(() => {
    const d = dimensions();
    return d.width >= 560 || d.height >= 320;
  });
  // Stack tiles in a column when the box has more vertical room than horizontal.
  const stacked = createMemo(() => {
    const d = dimensions();
    return d.height > d.width;
  });

  return (
    <Show
      when={!isSmall()}
      fallback={
        // --- Small: glyph + (status over name) stacked, compact tile row ---
        <div class="flex h-full flex-col gap-2">
          <div class="flex min-w-0 items-center gap-2">
            <Widget.Icon icon={<Icon icon={props.areaIcon} />} />
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <StatusBadge status={status()} compact />
              <h3 class="min-w-0 truncate font-semibold text-foreground text-sm leading-tight">
                {props.areaName}
              </h3>
            </div>
          </div>
          <Show
            when={tiles().length > 0}
            fallback={
              <div class="flex flex-1 items-center text-foreground/40 text-xs">No controls</div>
            }
          >
            <div class={`flex min-h-0 flex-1 gap-2 ${stacked() ? "flex-col" : ""}`}>
              <For each={tiles().slice(0, 3)}>
                {(t) => <ControlTile {...t} compact horizontal={stacked()} />}
              </For>
            </div>
          </Show>
        </div>
      }
    >
      {/* --- Medium+: glyph + (status over name) beside it, chips top-right, then tiles --- */}
      <div class="flex h-full flex-col gap-3">
        <div class="flex items-start justify-between gap-2">
          <div class="flex min-w-0 items-center gap-3">
            <Widget.Icon icon={<Icon icon={props.areaIcon} />} />
            <div class="flex min-w-0 flex-col gap-0.5">
              <StatusBadge status={status()} />
              <h3
                class={`min-w-0 truncate font-bold text-foreground leading-tight ${
                  isLarge() ? "text-2xl" : "text-lg"
                }`}
              >
                {props.areaName}
              </h3>
            </div>
          </div>
          <Show when={chips().length > 0}>
            <div class="flex max-w-[45%] shrink-0 flex-wrap justify-end gap-1">
              <For each={chips().slice(0, isLarge() ? 5 : 3)}>{(c) => <StatusChip {...c} />}</For>
            </div>
          </Show>
        </div>

        <Show
          when={tiles().length > 0}
          fallback={
            <div class="flex flex-1 items-center justify-center text-foreground/40 text-sm">
              No controls in this area
            </div>
          }
        >
          <div class={`flex min-h-0 flex-1 gap-2.5 ${stacked() ? "flex-col" : ""}`}>
            <For each={tiles()}>{(t) => <ControlTile {...t} horizontal={stacked()} />}</For>
          </div>
        </Show>
      </div>
    </Show>
  );
}
