import type { ClockConfig, ClockPreset, DateFormat } from "./types";

/* Per-preset gradient strings — raw CSS for the channel API's <Widget gradient=...> contract.
 * tuned in Phase 29 — placeholder oklch hues match the shell formula's direction/opacities. */
export const CLOCK_GRADIENTS: Record<ClockPreset, string> = {
  modern:
    "linear-gradient(135deg, color-mix(in oklch, oklch(0.7 0.18 240) 22%, transparent), color-mix(in oklch, oklch(0.7 0.18 200) 12%, transparent))",
  classic:
    "linear-gradient(135deg, color-mix(in oklch, oklch(0.7 0.18 70) 22%, transparent), color-mix(in oklch, oklch(0.7 0.18 40) 12%, transparent))",
  minimal:
    "linear-gradient(135deg, color-mix(in oklch, oklch(0.7 0.02 250) 22%, transparent), color-mix(in oklch, oklch(0.7 0.02 250) 12%, transparent))",
  bold:
    "linear-gradient(135deg, color-mix(in oklch, oklch(0.7 0.18 20) 22%, transparent), color-mix(in oklch, oklch(0.7 0.18 330) 12%, transparent))",
};

export function getTimeParts(
  date: Date,
  timeFormat: "12" | "24" = "24",
  timeZone?: string,
): { hours: string; minutes: string; seconds: string; period?: string } {
  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: timeFormat === "12",
    ...(timeZone && { timeZone }),
  };

  const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(date);

  let hours = "00";
  let minutes = "00";
  let seconds = "00";
  let period: string | undefined;

  for (const part of parts) {
    switch (part.type) {
      case "hour":
        hours = part.value.padStart(2, "0");
        break;
      case "minute":
        minutes = part.value;
        break;
      case "second":
        seconds = part.value;
        break;
      case "dayPeriod":
        period = part.value;
        break;
    }
  }

  return { hours, minutes, seconds, period };
}

export function getDayOfWeek(date: Date, timeZone?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    ...(timeZone && { timeZone }),
  };
  return new Intl.DateTimeFormat("en-US", options).format(date).toUpperCase();
}

export function formatDate(date: Date, format: DateFormat, timeZone?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(timeZone && { timeZone }),
  };

  const formatted = new Intl.DateTimeFormat("en-US", options).format(date);
  const [month, day, year] = formatted.split("/");

  switch (format) {
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "DD/MM/YYYY":
      return `${day}/${month}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    default:
      return formatted;
  }
}

export function getClockGradient(preset?: ClockPreset): string {
  return CLOCK_GRADIENTS[preset ?? "modern"];
}

export function getDefaultConfig(): ClockConfig {
  return {
    clockStyle: "digital",
    clockSize: "small",
    showSeconds: false,
    timeFormat: "24",
    preset: "modern",
    showDate: false,
    dateFormat: "MM/DD/YYYY",
    fontSize: "medium",
    layout: "auto",
    analogOptions: {
      border: false,
      ticks: "hour",
    },
  };
}
