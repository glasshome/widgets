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

function dateText(
  now: Date,
  config: Pick<ClockConfig, "dateFormat" | "timeZone">,
  tools: Tools,
): string {
  const { timeZone } = config;
  if (config.dateFormat === "auto") {
    return tools.formatDate(now, { day: "numeric", month: "short", timeZone });
  }
  const parts = tools.formatDateParts(now, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  });
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const [year, month, day] = [part("year"), part("month"), part("day")];
  switch (config.dateFormat) {
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "DD/MM/YYYY":
      return `${day}/${month}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
  }
}

export function readingLabel(
  tools: Pick<TranslationTools, "t" | "formatDate">,
  date: Date,
  timeZone?: string,
): string {
  const time = tools.formatDate(date, { hour: "numeric", minute: "2-digit", timeZone });
  return tools.t("clock.analog.reading", { time });
}
