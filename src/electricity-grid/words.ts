import type { TranslationTools } from "@glasshome/widget-sdk";
import { capitalised } from "../common/text";
import type { Verdict } from "./verdict";

type Tools = Pick<TranslationTools, "t" | "formatNumber">;

export function gridNumber(tools: Tools, value: number): string {
  const digits = Number.isInteger(value) ? 0 : value < 10 ? 2 : 1;
  return tools.formatNumber(value, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function gridLines(tools: Tools, verdict: Verdict, co2: number | null) {
  return {
    eyebrow: verdict.priceNote ? capitalised(verdict.priceNote) : tools.t("electricity-grid.title"),
    sub: tools.t("electricity-grid.low-carbon", {
      percent: Math.round(verdict.lowCarbonPct),
    }),
    co2:
      co2 === null ? undefined : tools.t("electricity-grid.co2", { value: gridNumber(tools, co2) }),
  };
}
