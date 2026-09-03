import { defineConfig, field, type Infer } from "@glasshome/widget-sdk";

export type ClockStyle = "digital" | "analog" | "square";
export type ClockSize = "small" | "medium" | "large";
export type TickType = "none" | "quarter" | "hour" | "minute";
export type ClockPreset = "modern" | "classic" | "minimal" | "bold";
export type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
export type ClockFontSize = "small" | "medium" | "large";
export type ClockLayout = "auto" | "horizontal" | "stacked";

export const configSchema = defineConfig({
  clockStyle: field.choice(["digital", "analog", "square"], {
    title: "Clock Style",
    default: "digital",
  }),
  clockSize: field.choice(["small", "medium", "large"], { title: "Clock Size", default: "small" }),
  showSeconds: field.toggle({ title: "Show Seconds", default: false }),
  timeFormat: field.choice(["24", "12"], { title: "Time Format", default: "24" }),
  timeZone: field.text({ title: "Timezone" }),
  preset: field.choice(["modern", "classic", "minimal", "bold"], {
    title: "Theme Preset",
    default: "modern",
  }),
  showDate: field.toggle({ title: "Show Date", default: false }),
  dateFormat: field.choice(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"], {
    title: "Date Format",
    default: "MM/DD/YYYY",
  }),
  fontSize: field.choice(["small", "medium", "large"], { title: "Font Size", default: "medium" }),
  layout: field.choice(["auto", "horizontal", "stacked"], { title: "Layout", default: "auto" }),
  analogOptions: field.group(
    {
      border: field.toggle({ title: "Show Border", default: false }),
      ticks: field.choice(["none", "quarter", "hour", "minute"], {
        title: "Tick Marks",
        default: "hour",
      }),
    },
    { title: "Analog Options" },
  ),
});

export type ClockConfig = Infer<typeof configSchema>;
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
  gradient: string;
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
