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

// Short on purpose: the verdict line must survive a 2x1 tile untruncated.
const PHRASES: Record<Band, string> = {
  clean: "Good time",
  mixed: "Okay time",
  dirty: "Wait if you can",
};

const CLEAN_MIN = 60;
const MIXED_MIN = 30;

function band(lowCarbonPct: number): Band {
  if (lowCarbonPct >= CLEAN_MIN) return "clean";
  if (lowCarbonPct >= MIXED_MIN) return "mixed";
  return "dirty";
}

function priceNote(b: Band, price: number | null, cheapBelow: number | null): string {
  if (price === null || cheapBelow === null) return "";
  if (!Number.isFinite(price) || !Number.isFinite(cheapBelow)) return "";
  if (price <= 0) return "free right now";
  if (price < cheapBelow) return b === "dirty" ? "cheap, if it can't wait" : "cheap now";
  return b === "dirty" ? "" : "pricey now";
}

export function deriveVerdict(i: VerdictInputs): Verdict | null {
  if (i.fossilPct === null || !Number.isFinite(i.fossilPct)) return null;
  const lowCarbonPct = 100 - Math.min(100, Math.max(0, i.fossilPct));
  const b = band(lowCarbonPct);
  return {
    band: b,
    lowCarbonPct,
    phrase: PHRASES[b],
    priceNote: priceNote(b, i.price, i.cheapBelow),
  };
}
