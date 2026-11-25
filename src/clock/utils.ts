import type { ClockConfig, ClockPreset } from "./types";

/** Each preset's two glass stops; the shell paints them at its own wash. */
const CLOCK_TONES: Record<ClockPreset, { color: string; colorTo: string }> = {
  modern: { color: "oklch(0.7 0.18 240)", colorTo: "oklch(0.7 0.18 200)" },
  classic: { color: "oklch(0.7 0.18 70)", colorTo: "oklch(0.7 0.18 40)" },
  minimal: { color: "oklch(0.7 0.02 250)", colorTo: "oklch(0.7 0.02 250)" },
  bold: { color: "oklch(0.7 0.18 20)", colorTo: "oklch(0.7 0.18 330)" },
};

export function getClockTones(preset?: ClockPreset): { color: string; colorTo: string } {
  return CLOCK_TONES[preset ?? "modern"];
}

export function getDefaultConfig(): ClockConfig {
  return {
    clockStyle: "digital",
    clockSize: "small",
    showSeconds: false,
    timeFormat: "auto",
    preset: "modern",
    showDate: false,
    dateFormat: "auto",
    fontSize: "medium",
    layout: "auto",
    analogOptions: {
      border: false,
      ticks: "hour",
    },
  };
}
