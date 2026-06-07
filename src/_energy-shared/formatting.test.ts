import { describe, expect, test } from "bun:test";
import { describeFlow, describePower, formatEnergy, formatPower } from "./formatting";

describe("formatPower", () => {
  test("roadmap fixtures", () => {
    expect(formatPower(850)).toBe("850 W");
    expect(formatPower(3200)).toBe("3.2 kW");
  });

  test("below 1000 → integer watts", () => {
    expect(formatPower(0)).toBe("0 W");
    expect(formatPower(999)).toBe("999 W");
  });

  test("1000-9999 → one-decimal kW", () => {
    expect(formatPower(1000)).toBe("1.0 kW");
    expect(formatPower(9999)).toBe("10.0 kW");
  });

  test("≥10000 → integer kW", () => {
    expect(formatPower(12000)).toBe("12 kW");
    expect(formatPower(12400)).toBe("12 kW");
  });
});

describe("formatEnergy", () => {
  test("roadmap fixtures", () => {
    expect(formatEnergy(18400)).toBe("18.4 kWh");
    expect(formatEnergy(320)).toBe("320 Wh");
  });

  test("below 1000 → integer Wh", () => {
    expect(formatEnergy(999)).toBe("999 Wh");
  });

  test("1000-99999 → one-decimal kWh", () => {
    expect(formatEnergy(1000)).toBe("1.0 kWh");
  });

  test("≥100000 → integer kWh", () => {
    expect(formatEnergy(120000)).toBe("120 kWh");
  });
});

describe("describePower", () => {
  test("label and formatted power", () => {
    expect(describePower("Solar", 3200)).toBe("Solar: 3.2 kW");
  });
});

describe("describeFlow", () => {
  test("exporting to the grid", () => {
    expect(describeFlow({ gridExportW: 1500 })).toEqual({
      headline: "Sending 1.5 kW to the grid",
      detail: "Solar is covering everything",
    });
  });

  test("solar powering the home, grid untouched", () => {
    expect(describeFlow({ solarW: 2000, homeW: 1500 })).toEqual({
      headline: "Solar is powering your home",
      detail: "Grid untouched",
    });
  });

  test("solar powering the home while charging the battery", () => {
    expect(describeFlow({ solarW: 3000, homeW: 1500, batteryChargeW: 800 })).toEqual({
      headline: "Solar is powering your home",
      detail: "Charging the battery",
    });
  });

  test("solar and battery powering the home", () => {
    expect(describeFlow({ solarW: 1700, batteryDischargeW: 1000, homeW: 2700 })).toEqual({
      headline: "Solar and battery are powering your home",
      detail: "Grid untouched",
    });
  });

  test("running on battery when solar is asleep", () => {
    expect(describeFlow({ batteryDischargeW: 800 })).toEqual({
      headline: "Running on battery",
      detail: "Grid untouched",
    });
  });

  test("solar and grid together", () => {
    expect(describeFlow({ solarW: 1000, gridImportW: 500, homeW: 2000 })).toEqual({
      headline: "Solar and grid are powering your home",
      detail: "Solar is covering part of it",
    });
  });

  test("importing from the grid", () => {
    expect(describeFlow({ gridImportW: 600 })).toEqual({
      headline: "Using 600 W from the grid",
      detail: "",
    });
  });

  test("grid import notes resting solar at night", () => {
    expect(describeFlow({ gridImportW: 600, solarSleeping: true })).toEqual({
      headline: "Using 600 W from the grid",
      detail: "Solar is resting until sunrise",
    });
  });

  test("fallback to home usage", () => {
    expect(describeFlow({ homeW: 450 })).toEqual({ headline: "Home using 450 W", detail: "" });
    expect(describeFlow({})).toEqual({ headline: "Home using 0 W", detail: "" });
  });

  test("export takes priority over solar-powering", () => {
    expect(describeFlow({ solarW: 3000, gridExportW: 1000, homeW: 1000 }).headline).toBe(
      "Sending 1.0 kW to the grid",
    );
  });

  test("never headlines battery while solar out-contributes it", () => {
    // Solar 1700 > battery 1000: headline must name solar first, not battery.
    expect(describeFlow({ solarW: 1700, batteryDischargeW: 1000, homeW: 2700 }).headline).not.toBe(
      "Running on battery",
    );
  });

  test("no exclamation marks anywhere", () => {
    const samples = [
      describeFlow({ gridExportW: 1500 }),
      describeFlow({ solarW: 2000, homeW: 1500 }),
      describeFlow({ batteryDischargeW: 800 }),
      describeFlow({ gridImportW: 600 }),
      describeFlow({ homeW: 450 }),
    ];
    for (const s of samples) {
      expect(s.headline).not.toContain("!");
      expect(s.detail).not.toContain("!");
    }
  });
});
