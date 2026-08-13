import { Icon } from "@iconify-icon/solid";
import type { JSX } from "solid-js";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Horizontal clean-to-dirty scale; the marker's position encodes the state. */
export function BandMeter(props: {
  lowCarbonPct: number;
  tint: string;
  reducedMotion: boolean;
}): JSX.Element {
  const x = () => Math.min(100, Math.max(0, props.lowCarbonPct));
  return (
    <div class="flex w-full items-center gap-2 text-muted-foreground">
      <Icon icon="mdi:leaf" style={{ "font-size": "14px" }} aria-label="clean" />
      <div class="relative h-2 min-w-0 flex-1 rounded-full bg-muted">
        <div
          class="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${100 - x()}%`,
            background: props.tint,
            "box-shadow": `0 0 8px color-mix(in oklch, ${props.tint} 55%, transparent)`,
            transition: props.reducedMotion ? "none" : `left 500ms ${EASE}`,
          }}
        />
      </div>
      <Icon icon="mdi:factory" style={{ "font-size": "14px" }} aria-label="dirty" />
    </div>
  );
}

/** Three-quarter arc filled to the low-carbon share, share and label centered. */
export function ArcGauge(props: {
  lowCarbonPct: number;
  tint: string;
  label: string;
  reducedMotion: boolean;
}): JSX.Element {
  const R = 40;
  const SWEEP = 0.75;
  const circumference = 2 * Math.PI * R;
  const arcLen = circumference * SWEEP;
  const filled = () => (Math.min(100, Math.max(0, props.lowCarbonPct)) / 100) * arcLen;
  return (
    <div class="relative mx-auto aspect-square h-full max-h-[160px]">
      <svg viewBox="0 0 100 100" class="h-full w-full" style={{ transform: "rotate(135deg)" }}>
        <title>{`${Math.round(props.lowCarbonPct)}% low-carbon`}</title>
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="var(--muted)"
          stroke-width="7"
          stroke-linecap="round"
          stroke-dasharray={`${arcLen} ${circumference}`}
        />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={props.tint}
          stroke-width="7"
          stroke-linecap="round"
          stroke-dasharray={`${filled()} ${circumference}`}
          style={{ transition: props.reducedMotion ? "none" : `stroke-dasharray 600ms ${EASE}` }}
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span class="font-semibold text-2xl leading-none tabular-nums" style={{ color: props.tint }}>
          {Math.round(props.lowCarbonPct)}%
        </span>
        <span class="text-[10px] text-muted-foreground leading-none">{props.label}</span>
      </div>
    </div>
  );
}
