import type { TranslationTools } from "@glasshome/widget-sdk";
import type { ClockConfig } from "./types";

export interface ClockFace {
  hours: string;
  minutes: string;
  seconds: string;
  period?: string;
  weekday: string;
  date: string;
}

type Tools = Pick<TranslationTools, "formatDate" | "formatDateParts">;

const TIME_CYCLE: Record<ClockConfig["timeFormat"], Intl.DateTimeFormatOptions> = {
  auto: {},
  "24": { hourCycle: "h23" },
  "12": { hour12: true },
};

export function clockFace(
  now: Date,
  config: Pick<ClockConfig, "timeFormat" | "dateFormat" | "timeZone">,
  tools: Tools,
): ClockFace {
  const { timeZone } = config;
  const time = tools.formatDateParts(now, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    ...TIME_CYCLE[config.timeFormat],
    timeZone,
  });
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    time.find((p) => p.type === type)?.value ?? "";
  return {
    hours: part("hour"),
    minutes: part("minute"),
    seconds: part("second"),
    period: part("dayPeriod") || undefined,
    weekday: tools.formatDate(now, { weekday: "long", timeZone }),
    date: dateText(now, config, tools),
  };
}

type DatePart = "day" | "month" | "year";
type FixedDate = Exclude<ClockConfig["dateFormat"], "auto">;

const DATE_ORDER: Record<FixedDate, { order: readonly DatePart[]; separator?: string }> = {
  "MM/DD/YYYY": { order: ["month", "day", "year"] },
  "DD/MM/YYYY": { order: ["day", "month", "year"] },
  "YYYY-MM-DD": { order: ["year", "month", "day"], separator: "-" },
};

const NUMERIC_DATE = { year: "numeric", month: "2-digit", day: "2-digit" } as const;

function joined(format: FixedDate, parts: Record<DatePart, string>, spoken: string): string {
  const { order, separator = spoken } = DATE_ORDER[format];
  return order.map((part) => parts[part]).join(separator);
}

const separatorOf = (parts: readonly Intl.DateTimeFormatPart[]) =>
  parts.find((p) => p.type === "literal")?.value || "/";

function dateText(
  now: Date,
  config: Pick<ClockConfig, "dateFormat" | "timeZone">,
  tools: Tools,
): string {
  const { timeZone } = config;
  if (config.dateFormat === "auto") {
    return tools.formatDate(now, { day: "numeric", month: "short", timeZone });
  }
  const parts = tools.formatDateParts(now, { ...NUMERIC_DATE, timeZone });
  const part = (type: DatePart) => parts.find((p) => p.type === type)?.value ?? "";
  return joined(
    config.dateFormat,
    { day: part("day"), month: part("month"), year: part("year") },
    separatorOf(parts),
  );
}

/** The option label for a fixed date format, in the order and with the separator the clock writes. */
export function datePattern(
  format: FixedDate,
  tools: Pick<TranslationTools, "t" | "formatDateParts">,
): string {
  const letters = {
    day: tools.t("clock.dialog.date.day"),
    month: tools.t("clock.dialog.date.month"),
    year: tools.t("clock.dialog.date.year"),
  };
  return joined(format, letters, separatorOf(tools.formatDateParts(new Date(0), NUMERIC_DATE)));
}

export function readingLabel(
  tools: Pick<TranslationTools, "t" | "formatDate">,
  date: Date,
  timeZone?: string,
): string {
  const time = tools.formatDate(date, { hour: "numeric", minute: "2-digit", timeZone });
  return tools.t("clock.analog.reading", { time });
}
