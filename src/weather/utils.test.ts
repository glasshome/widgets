import { describe, expect, it } from "bun:test";
import { formatTemp, getConditionLabel } from "./utils";

describe("getConditionLabel", () => {
  it("turns raw Home Assistant states into homeowner copy", () => {
    expect(getConditionLabel("partlycloudy")).toBe("Partly cloudy");
    expect(getConditionLabel("clear-night")).toBe("Clear");
    expect(getConditionLabel("snowy-rainy")).toBe("Sleet");
  });

  it("prettifies an unknown state instead of showing it raw", () => {
    expect(getConditionLabel("blowing-snow")).toBe("Blowing snow");
    expect(getConditionLabel("")).toBe("");
  });
});

describe("formatTemp", () => {
  it("writes below-zero readings with a minus sign", () => {
    expect(formatTemp(-2.4)).toBe("\u22122\u00B0");
    expect(formatTemp(21.6)).toBe("22\u00B0");
  });
});
