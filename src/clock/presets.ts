import type { ClockPreset, ClockPresetTheme } from "./types";

export const CLOCK_PRESETS: Record<ClockPreset, ClockPresetTheme> = {
  modern: {
    name: "Modern",
    description: "Clean, contemporary look with cyan glow",
    digital: {
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      fontWeight: "700",
      letterSpacing: "0.02em",
      gradient: { from: "from-cyan-500/20", to: "to-blue-600/20" },
      textColor: "text-foreground",
      glowColor: "rgba(34, 211, 238, 0.5)",
      secondsColor: "text-amber-400",
      dayColor: "text-fuchsia-400",
    },
    analog: {
      faceColor: "rgba(255, 255, 255, 0.05)",
      handColor: "rgb(34, 211, 238)",
      accentColor: "rgb(239, 68, 68)",
      tickColor: "rgba(255, 255, 255, 0.6)",
    },
  },

  classic: {
    name: "Classic",
    description: "Traditional, elegant style with warm tones",
    digital: {
      fontFamily: "Georgia, Cambria, serif",
      fontWeight: "400",
      letterSpacing: "0.02em",
      gradient: { from: "from-amber-500/20", to: "to-orange-500/20" },
      textColor: "text-amber-50",
      glowColor: "rgba(245, 158, 11, 0.4)",
      secondsColor: "text-amber-300",
      dayColor: "text-amber-200/70",
    },
    analog: {
      faceColor: "rgba(245, 158, 11, 0.1)",
      handColor: "rgb(217, 119, 6)",
      accentColor: "rgb(239, 68, 68)",
      tickColor: "rgba(245, 158, 11, 0.7)",
    },
  },

  minimal: {
    name: "Minimal",
    description: "Simple, understated and technical",
    digital: {
      fontFamily: "ui-monospace, SFMono-Regular, monospace",
      fontWeight: "400",
      letterSpacing: "0.05em",
      gradient: { from: "from-slate-500/10", to: "to-slate-600/10" },
      textColor: "text-slate-100",
      glowColor: undefined,
      secondsColor: "text-slate-400",
      dayColor: "text-slate-400",
    },
    analog: {
      faceColor: "rgba(255, 255, 255, 0.02)",
      handColor: "rgb(229, 231, 235)",
      accentColor: "rgb(239, 68, 68)",
      tickColor: "rgba(255, 255, 255, 0.4)",
    },
  },

  bold: {
    name: "Bold",
    description: "Strong, high-contrast with vivid glow",
    digital: {
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      fontWeight: "900",
      letterSpacing: "-0.02em",
      gradient: { from: "from-violet-500/20", to: "to-fuchsia-500/20" },
      textColor: "text-foreground",
      glowColor: "rgba(167, 139, 250, 0.5)",
      secondsColor: "text-emerald-400",
      dayColor: "text-rose-400",
    },
    analog: {
      faceColor: "rgba(167, 139, 250, 0.1)",
      handColor: "rgb(167, 139, 250)",
      accentColor: "rgb(236, 72, 153)",
      tickColor: "rgba(167, 139, 250, 0.7)",
    },
  },
};

export function getPresetTheme(preset: ClockPreset): ClockPresetTheme {
  return CLOCK_PRESETS[preset];
}
