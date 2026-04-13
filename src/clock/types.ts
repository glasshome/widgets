import { z } from "zod";

export type ClockStyle = "digital" | "analog";
export type ClockSize = "small" | "medium" | "large";
export type TickType = "none" | "quarter" | "hour" | "minute";
export type ClockPreset = "modern" | "classic" | "minimal" | "bold";
export type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
export type ClockFontSize = "small" | "medium" | "large";
export type ClockLayout = "auto" | "horizontal" | "stacked";

export const configSchema = z.object({
  clockStyle: z
    .enum(["digital", "analog"])
    .default("digital")
    .meta({ title: "Clock Style" }),
  clockSize: z
    .enum(["small", "medium", "large"])
    .default("small")
    .meta({ title: "Clock Size" }),
  showSeconds: z.boolean().default(false).meta({ title: "Show Seconds" }),
  timeFormat: z
    .enum(["24", "12"])
    .default("24")
    .meta({ title: "Time Format" }),
  timeZone: z.string().optional().meta({ title: "Timezone" }),
  preset: z
    .enum(["modern", "classic", "minimal", "bold"])
    .default("modern")
    .meta({ title: "Theme Preset" }),
  showDate: z.boolean().default(false).meta({ title: "Show Date" }),
  dateFormat: z
    .enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"])
    .default("MM/DD/YYYY")
    .meta({ title: "Date Format" }),
  fontSize: z
    .enum(["small", "medium", "large"])
    .default("medium")
    .meta({ title: "Font Size" }),
  layout: z
    .enum(["auto", "horizontal", "stacked"])
    .default("auto")
    .meta({ title: "Layout" }),
  analogOptions: z
    .object({
      border: z.boolean().default(false).meta({ title: "Show Border" }),
      ticks: z
        .enum(["none", "quarter", "hour", "minute"])
        .default("hour")
        .meta({ title: "Tick Marks" }),
    })
    .default({ border: false, ticks: "hour" })
    .meta({ title: "Analog Options" }),
});

export type ClockConfig = z.infer<typeof configSchema>;
export type AnalogOptions = ClockConfig["analogOptions"];

export interface AnalogPresetTheme {
  faceColor: string;
  handColor: string;
  accentColor: string;
  tickColor: string;
}

export interface DigitalPresetTheme {
  fontFamily: string;
  fontWeight: string;
  letterSpacing: string;
  gradient: { from: string; to: string };
  textColor: string;
  glowColor?: string;
  secondsColor?: string;
  dayColor?: string;
}

export interface ClockPresetTheme {
  name: string;
  description: string;
  digital: DigitalPresetTheme;
  analog: AnalogPresetTheme;
}
