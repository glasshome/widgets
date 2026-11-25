import type { TranslationTools } from "@glasshome/widget-sdk";

export type Band = "clean" | "mixed" | "dirty";

export interface VerdictInputs {
  fossilPct: number | null;
  price: number | null;
  cheapBelow: number | null;
}

export interface Verdict {
  band: Band;
  lowCarbonPct: number;
  phrase: string;
  priceNote: string;
}

const PHRASES: Record<Band, string> = {
  clean: "electricity-grid.verdict.clean",
  mixed: "electricity-grid.verdict.mixed",
  dirty: "electricity-grid.verdict.dirty",
};

const CLEAN_MIN = 60;
const MIXED_MIN = 30;

function band(lowCarbonPct: number): Band {
  if (lowCarbonPct >= CLEAN_MIN) return "clean";
  if (lowCarbonPct >= MIXED_MIN) return "mixed";
  return "dirty";
}

function priceNote(
  b: Band,
  price: number | null,
  cheapBelow: number | null,
  tools: Pick<TranslationTools, "t">,
): string {
  if (price === null || cheapBelow === null) return "";
  if (!Number.isFinite(price) || !Number.isFinite(cheapBelow)) return "";
  if (price <= 0) return tools.t("electricity-grid.price-note.free");
  if (price < cheapBelow) {
    return tools.t(
      b === "dirty"
        ? "electricity-grid.price-note.cheap-if-urgent"
        : "electricity-grid.price-note.cheap",
    );
  }
  return b === "dirty" ? "" : tools.t("electricity-grid.price-note.pricey");
}

export function deriveVerdict(
  i: VerdictInputs,
  tools: Pick<TranslationTools, "t">,
): Verdict | null {
  if (i.fossilPct === null || !Number.isFinite(i.fossilPct)) return null;
  const lowCarbonPct = 100 - Math.min(100, Math.max(0, i.fossilPct));
  const b = band(lowCarbonPct);
  return {
    band: b,
    lowCarbonPct,
    phrase: tools.t(PHRASES[b]),
    priceNote: priceNote(b, i.price, i.cheapBelow, tools),
  };
}
