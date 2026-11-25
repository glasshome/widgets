import type { TranslationTools } from "@glasshome/widget-sdk";

export function buttonLines(
  tools: TranslationTools,
  stamp: string | undefined,
): { value: string; sub: string } {
  const date = stamp ? new Date(stamp) : undefined;
  if (!date || Number.isNaN(date.getTime())) {
    return { value: "", sub: tools.t("button.hero.never") };
  }
  const value = tools.formatDate(date, { hour: "numeric", minute: "2-digit" });
  return { value, sub: tools.t("button.hero.last-pressed") };
}
