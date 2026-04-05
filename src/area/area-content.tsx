import { useWidgetContext, Widget } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, Index, Show } from "solid-js";
import type { AreaMetrics, EntityGroups } from "./utils";

interface AreaContentProps {
  metrics: AreaMetrics;
  groups: EntityGroups;
  areaName: string;
  areaIcon: string;
  onToggleLights: () => void;
}

// --- Metric pill ---

interface MetricPillDef {
  key: string;
  icon: string;
  value: string;
  color: string;
  bg: string;
  title: string;
}

function MetricPill(props: MetricPillDef) {
  return (
    <span
      class={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${props.bg} ${props.color}`}
      title={props.title}
    >
      <Icon icon={props.icon} width={13} />
      {props.value}
    </span>
  );
}

// --- Light toggle button ---

function LightToggle(props: {
  lightsOn: number;
  lightsTotal: number;
  large?: boolean;
  onToggle: () => void;
}) {
  const anyOn = () => props.lightsOn > 0;
  const size = () => (props.large ? 44 : 40);
  const iconSize = () => (props.large ? 22 : 18);

  return (
    <div class="flex shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        class={`flex items-center justify-center rounded-full border-2 transition-all ${
          anyOn()
            ? "border-yellow-500/40 dark:border-yellow-400/40 bg-yellow-400/20 text-yellow-600 dark:text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.2)] hover:bg-yellow-400/30"
            : "border-foreground/15 bg-foreground/10 text-foreground/50 hover:bg-foreground/15 hover:text-foreground/70"
        }`}
        style={{ width: `${size()}px`, height: `${size()}px` }}
        on:pointerdown={(e: PointerEvent) => e.stopPropagation()}
        on:pointerup={(e: PointerEvent) => e.stopPropagation()}
        on:click={() => props.onToggle()}
      >
        <Icon icon={anyOn() ? "mdi:lightbulb" : "mdi:lightbulb-outline"} width={iconSize()} />
      </button>
      <span class={`text-[10px] tabular-nums ${anyOn() ? "text-yellow-600/70 dark:text-yellow-300/70" : "text-foreground/30"}`}>
        {props.lightsOn}/{props.lightsTotal}
      </span>
    </div>
  );
}

// --- Build secondary pills (excludes temp/humidity shown as primary) ---

function buildSecondaryPills(metrics: AreaMetrics): MetricPillDef[] {
  const pills: MetricPillDef[] = [];

  if (metrics.co2 !== null) {
    const c = metrics.co2;
    const color = c >= 1000 ? "text-red-300" : c >= 800 ? "text-amber-300" : "text-emerald-300";
    const bg = c >= 1000 ? "bg-red-500/15" : c >= 800 ? "bg-amber-500/15" : "bg-emerald-500/15";
    pills.push({ key: "co2", icon: "mdi:molecule-co2", value: `${c.toFixed(0)}`, color, bg, title: `CO₂: ${c.toFixed(0)} ppm` });
  }
  if (metrics.pm25 !== null) {
    const p = metrics.pm25;
    const color = p >= 35 ? "text-red-300" : p >= 12 ? "text-amber-300" : "text-emerald-300";
    const bg = p >= 35 ? "bg-red-500/15" : p >= 12 ? "bg-amber-500/15" : "bg-emerald-500/15";
    pills.push({ key: "pm25", icon: "mdi:blur", value: `${p.toFixed(0)}`, color, bg, title: `PM2.5: ${p.toFixed(0)} µg/m³` });
  }
  if (metrics.hasPresence) {
    pills.push({ key: "presence", icon: "mdi:account", value: "Occupied", color: "text-violet-300", bg: "bg-violet-500/15", title: "Presence detected" });
  }
  if (metrics.hasMotion) {
    pills.push({ key: "motion", icon: "mdi:motion-sensor", value: "Motion", color: "text-amber-300", bg: "bg-amber-500/15", title: "Motion detected" });
  }

  return pills;
}

// --- Build all pills (for compact view) ---

function buildAllPills(metrics: AreaMetrics): MetricPillDef[] {
  const pills: MetricPillDef[] = [];

  if (metrics.temperature !== null) {
    const t = metrics.temperature;
    const color = t >= 26 ? "text-red-300" : t <= 18 ? "text-blue-300" : "text-emerald-300";
    const bg = t >= 26 ? "bg-red-500/15" : t <= 18 ? "bg-blue-500/15" : "bg-emerald-500/15";
    pills.push({ key: "temp", icon: "mdi:thermometer", value: `${t.toFixed(1)}°`, color, bg, title: `Temperature: ${t.toFixed(1)}°` });
  }
  if (metrics.humidity !== null) {
    const h = metrics.humidity;
    const color = h >= 60 ? "text-blue-300" : h <= 30 ? "text-amber-300" : "text-cyan-300";
    const bg = h >= 60 ? "bg-blue-500/15" : h <= 30 ? "bg-amber-500/15" : "bg-cyan-500/15";
    pills.push({ key: "hum", icon: "mdi:water-percent", value: `${h.toFixed(0)}%`, color, bg, title: `Humidity: ${h.toFixed(0)}%` });
  }
  if (metrics.lightsTotal > 0) {
    const anyOn = metrics.lightsOn > 0;
    pills.push({
      key: "lights",
      icon: anyOn ? "mdi:lightbulb" : "mdi:lightbulb-outline",
      value: `${metrics.lightsOn}/${metrics.lightsTotal}`,
      color: anyOn ? "text-yellow-300" : "text-foreground/50",
      bg: anyOn ? "bg-yellow-400/15" : "bg-foreground/5",
      title: `Lights: ${metrics.lightsOn} of ${metrics.lightsTotal} on`,
    });
  }

  return [...pills, ...buildSecondaryPills(metrics)];
}

// --- Primary metrics (big temperature/humidity) ---

function PrimaryMetrics(props: { metrics: AreaMetrics; large?: boolean }) {
  const textSize = () => (props.large ? "text-3xl" : "text-2xl");
  const unitSize = () => (props.large ? "text-lg" : "text-base");
  const iconSize = () => (props.large ? 20 : 16);

  const tempDisplay = () =>
    props.metrics.temperature !== null ? props.metrics.temperature.toFixed(1) : "—";
  const humDisplay = () =>
    props.metrics.humidity !== null ? props.metrics.humidity.toFixed(0) : "—";

  return (
    <div class="flex items-baseline gap-5">
      <div class="flex items-center gap-1.5">
        <Icon icon="mdi:thermometer" width={iconSize()} class="text-foreground/40" />
        <span class={`${textSize()} font-bold tabular-nums text-foreground`}>
          {tempDisplay()}
          <span class={`${unitSize()} font-medium text-foreground/40`}>°</span>
        </span>
      </div>
      <div class="flex items-center gap-1.5">
        <Icon icon="mdi:water-percent" width={iconSize()} class="text-foreground/40" />
        <span class={`${textSize()} font-bold tabular-nums text-foreground`}>
          {humDisplay()}
          <span class={`${unitSize()} font-medium text-foreground/40`}>%</span>
        </span>
      </div>
    </div>
  );
}

// --- Main content ---

export function AreaContent(props: AreaContentProps) {
  const ctx = useWidgetContext();
  const secondaryPills = createMemo(() => buildSecondaryPills(props.metrics));
  const allPills = createMemo(() => buildAllPills(props.metrics));
  const hasLights = createMemo(() => props.metrics.lightsTotal > 0);
  const isSmall = createMemo(() => ctx.size() === "xs" || ctx.size() === "sm");
  const isLarge = createMemo(() => ctx.size() === "lg" || ctx.size() === "xl");

  return (
    <Show
      when={!isSmall()}
      fallback={
        // --- Small (xs/sm): Compact single-row ---
        <div class="flex items-center gap-2 overflow-hidden">
          <Widget.Icon icon={<Icon icon={props.areaIcon} />} color="bg-white/10" />
          <div class="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden">
            <Widget.Title>{props.areaName}</Widget.Title>
            <div class="flex flex-wrap items-center gap-1">
              <Index each={allPills().slice(0, 3)}>
                {(pill) => <MetricPill {...pill()} />}
              </Index>
            </div>
          </div>
          <Show when={hasLights()}>
            <LightToggle
              lightsOn={props.metrics.lightsOn}
              lightsTotal={props.metrics.lightsTotal}
              onToggle={props.onToggleLights}
            />
          </Show>
        </div>
      }
    >
      {/* --- Medium+ (md/lg/xl): Header top, metrics bottom --- */}
      <div class="flex h-full flex-col justify-between overflow-hidden">
        {/* Header */}
        <div class="flex items-center gap-3">
          <Widget.Icon icon={<Icon icon={props.areaIcon} />} color="bg-white/10" />
          <div class="min-w-0 flex-1 overflow-hidden">
            <Widget.Title>{props.areaName}</Widget.Title>
            <Show when={isLarge() && (props.metrics.hasPresence || props.metrics.hasMotion)}>
              <div class="mt-0.5 flex items-center gap-2">
                <Show when={props.metrics.hasPresence}>
                  <span class="flex items-center gap-1 text-xs text-violet-300">
                    <Icon icon="mdi:account" width={12} /> Occupied
                  </span>
                </Show>
                <Show when={props.metrics.hasMotion}>
                  <span class="flex items-center gap-1 text-xs text-amber-300">
                    <Icon icon="mdi:motion-sensor" width={12} /> Motion
                  </span>
                </Show>
              </div>
            </Show>
          </div>
        </div>

        {/* Bottom: metrics + controls */}
        <div class="flex items-end justify-between gap-3">
          <div class="flex min-w-0 flex-1 flex-col gap-2.5">
            <PrimaryMetrics metrics={props.metrics} large={isLarge()} />

            <Show when={isLarge() && props.metrics.alertCount > 0}>
              <div class="flex items-center gap-1.5 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-xs font-medium text-red-300">
                <Icon icon="mdi:alert-circle" width={14} />
                {props.metrics.alertCount} alert{props.metrics.alertCount > 1 ? "s" : ""} active
              </div>
            </Show>

            <div class="flex flex-wrap gap-1.5">
              <Index each={secondaryPills().slice(0, isLarge() ? 5 : 4)}>
                {(pill) => <MetricPill {...pill()} />}
              </Index>
            </div>
          </div>

          <Show when={hasLights()}>
            <LightToggle
              lightsOn={props.metrics.lightsOn}
              lightsTotal={props.metrics.lightsTotal}
              large
              onToggle={props.onToggleLights}
            />
          </Show>
        </div>
      </div>
    </Show>
  );
}
