export type ClockStyle = "digital" | "analog";
export type ClockSize = "small" | "medium" | "large";
export type TickType = "none" | "quarter" | "hour" | "minute";
export type ClockPreset = "modern" | "classic" | "minimal" | "bold";
export type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
export type ClockFontSize = "small" | "medium" | "large";
export type ClockLayout = "auto" | "horizontal" | "stacked";

export interface AnalogOptions {
  border?: boolean;
  ticks?: TickType;
}

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

export interface ClockConfig {
  clockStyle: ClockStyle;
  clockSize: ClockSize;
  showSeconds: boolean;
  timeFormat: "12" | "24";
  timeZone?: string;
  analogOptions: AnalogOptions;
  preset: ClockPreset;
  showDate: boolean;
  dateFormat: DateFormat;
  fontSize: ClockFontSize;
  layout: ClockLayout;
}
