import { describe, expect, test } from "bun:test";
import { deriveVerdict, type VerdictInputs } from "./verdict";

function inputs(overrides: Partial<VerdictInputs> = {}): VerdictInputs {
  return { fossilPct: null, price: null, cheapBelow: null, ...overrides };
}

describe("bands", () => {
  test("low-carbon 60 and above is clean", () => {
    expect(deriveVerdict(inputs({ fossilPct: 40 }))?.band).toBe("clean");
    expect(deriveVerdict(inputs({ fossilPct: 0 }))?.band).toBe("clean");
  });
  test("low-carbon 30 to 60 is mixed", () => {
    expect(deriveVerdict(inputs({ fossilPct: 41 }))?.band).toBe("mixed");
    expect(deriveVerdict(inputs({ fossilPct: 70 }))?.band).toBe("mixed");
  });
  test("low-carbon below 30 is dirty", () => {
    expect(deriveVerdict(inputs({ fossilPct: 71 }))?.band).toBe("dirty");
    expect(deriveVerdict(inputs({ fossilPct: 100 }))?.band).toBe("dirty");
  });
  test("fossil percentage is clamped to 0..100", () => {
    expect(deriveVerdict(inputs({ fossilPct: -5 }))?.band).toBe("clean");
    expect(deriveVerdict(inputs({ fossilPct: 150 }))?.band).toBe("dirty");
    expect(deriveVerdict(inputs({ fossilPct: 150 }))?.lowCarbonPct).toBe(0);
  });
  test("missing or non-finite fossil data yields null", () => {
    expect(deriveVerdict(inputs())).toBeNull();
    expect(deriveVerdict(inputs({ fossilPct: Number.NaN }))).toBeNull();
  });
});

describe("phrase matrix", () => {
  const clean = { fossilPct: 20 };
  const mixed = { fossilPct: 50 };
  const dirty = { fossilPct: 90 };
  const cheap = { price: 0.1, cheapBelow: 0.2 };
  const pricey = { price: 0.4, cheapBelow: 0.2 };

  test("carbon-only phrases", () => {
    expect(deriveVerdict(inputs(clean))?.phrase).toBe("Good time to run heavy loads");
    expect(deriveVerdict(inputs(mixed))?.phrase).toBe("Okay time");
    expect(deriveVerdict(inputs(dirty))?.phrase).toBe("Wait if you can");
  });
  test("carbon-only has no price note", () => {
    expect(deriveVerdict(inputs(clean))?.priceNote).toBe("");
  });
  test("cheap notes", () => {
    expect(deriveVerdict(inputs({ ...clean, ...cheap }))?.priceNote).toBe("power is cheap");
    expect(deriveVerdict(inputs({ ...mixed, ...cheap }))?.priceNote).toBe("power is cheap");
    expect(deriveVerdict(inputs({ ...dirty, ...cheap }))?.priceNote).toBe(
      "cheap, if it can't wait",
    );
  });
  test("pricey notes", () => {
    expect(deriveVerdict(inputs({ ...clean, ...pricey }))?.priceNote).toBe("but pricey");
    expect(deriveVerdict(inputs({ ...mixed, ...pricey }))?.priceNote).toBe("but pricey");
    expect(deriveVerdict(inputs({ ...dirty, ...pricey }))?.priceNote).toBe("");
  });
  test("price at or below zero reads as free in every band", () => {
    for (const band of [clean, mixed, dirty]) {
      expect(deriveVerdict(inputs({ ...band, price: -0.01, cheapBelow: 0.2 }))?.priceNote).toBe(
        "power is free right now",
      );
      expect(deriveVerdict(inputs({ ...band, price: 0, cheapBelow: 0.2 }))?.priceNote).toBe(
        "power is free right now",
      );
    }
  });
  test("price without threshold, or threshold without price, stays carbon-only", () => {
    expect(deriveVerdict(inputs({ ...clean, price: 0.1 }))?.priceNote).toBe("");
    expect(deriveVerdict(inputs({ ...clean, cheapBelow: 0.2 }))?.priceNote).toBe("");
    expect(deriveVerdict(inputs({ ...clean, price: Number.NaN, cheapBelow: 0.2 }))?.priceNote).toBe(
      "",
    );
  });
  test("exact threshold is not cheap", () => {
    expect(deriveVerdict(inputs({ ...clean, price: 0.2, cheapBelow: 0.2 }))?.priceNote).toBe(
      "but pricey",
    );
  });
});
