import { describe, expect, test } from "bun:test";
import { languageTools } from "@glasshome/widget-sdk/testing/tools";
import { language } from "../../tests/catalog";
import { deriveVerdict, type VerdictInputs } from "./verdict";

const tools = languageTools(language("electricity-grid", "en"));
const derive = (i: VerdictInputs) => deriveVerdict(i, tools);

function inputs(overrides: Partial<VerdictInputs> = {}): VerdictInputs {
  return { fossilPct: null, price: null, cheapBelow: null, ...overrides };
}

describe("bands", () => {
  test("low-carbon 60 and above is clean", () => {
    expect(derive(inputs({ fossilPct: 40 }))?.band).toBe("clean");
    expect(derive(inputs({ fossilPct: 0 }))?.band).toBe("clean");
  });
  test("low-carbon 30 to 60 is mixed", () => {
    expect(derive(inputs({ fossilPct: 41 }))?.band).toBe("mixed");
    expect(derive(inputs({ fossilPct: 70 }))?.band).toBe("mixed");
  });
  test("low-carbon below 30 is dirty", () => {
    expect(derive(inputs({ fossilPct: 71 }))?.band).toBe("dirty");
    expect(derive(inputs({ fossilPct: 100 }))?.band).toBe("dirty");
  });
  test("fossil percentage is clamped to 0..100", () => {
    expect(derive(inputs({ fossilPct: -5 }))?.band).toBe("clean");
    expect(derive(inputs({ fossilPct: 150 }))?.band).toBe("dirty");
    expect(derive(inputs({ fossilPct: 150 }))?.lowCarbonPct).toBe(0);
  });
  test("missing or non-finite fossil data yields null", () => {
    expect(derive(inputs())).toBeNull();
    expect(derive(inputs({ fossilPct: Number.NaN }))).toBeNull();
  });
});

describe("phrase matrix", () => {
  const clean = { fossilPct: 20 };
  const mixed = { fossilPct: 50 };
  const dirty = { fossilPct: 90 };
  const cheap = { price: 0.1, cheapBelow: 0.2 };
  const pricey = { price: 0.4, cheapBelow: 0.2 };

  test("carbon-only phrases", () => {
    expect(derive(inputs(clean))?.phrase).toBe("Good time");
    expect(derive(inputs(mixed))?.phrase).toBe("Okay time");
    expect(derive(inputs(dirty))?.phrase).toBe("Wait if you can");
  });
  test("carbon-only has no price note", () => {
    expect(derive(inputs(clean))?.priceNote).toBe("");
  });
  test("cheap notes", () => {
    expect(derive(inputs({ ...clean, ...cheap }))?.priceNote).toBe("cheap now");
    expect(derive(inputs({ ...mixed, ...cheap }))?.priceNote).toBe("cheap now");
    expect(derive(inputs({ ...dirty, ...cheap }))?.priceNote).toBe("cheap, if it can't wait");
  });
  test("pricey notes", () => {
    expect(derive(inputs({ ...clean, ...pricey }))?.priceNote).toBe("pricey now");
    expect(derive(inputs({ ...mixed, ...pricey }))?.priceNote).toBe("pricey now");
    expect(derive(inputs({ ...dirty, ...pricey }))?.priceNote).toBe("");
  });
  test("price at or below zero reads as free in every band", () => {
    for (const band of [clean, mixed, dirty]) {
      expect(derive(inputs({ ...band, price: -0.01, cheapBelow: 0.2 }))?.priceNote).toBe(
        "free right now",
      );
      expect(derive(inputs({ ...band, price: 0, cheapBelow: 0.2 }))?.priceNote).toBe(
        "free right now",
      );
    }
  });
  test("price without threshold, or threshold without price, stays carbon-only", () => {
    expect(derive(inputs({ ...clean, price: 0.1 }))?.priceNote).toBe("");
    expect(derive(inputs({ ...clean, cheapBelow: 0.2 }))?.priceNote).toBe("");
    expect(derive(inputs({ ...clean, price: Number.NaN, cheapBelow: 0.2 }))?.priceNote).toBe("");
  });
  test("exact threshold is not cheap", () => {
    expect(derive(inputs({ ...clean, price: 0.2, cheapBelow: 0.2 }))?.priceNote).toBe("pricey now");
  });
});
