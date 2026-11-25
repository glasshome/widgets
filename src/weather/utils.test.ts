import { describe, expect, it } from "bun:test";
import { languageTools } from "@glasshome/widget-sdk/testing/tools";
import { language } from "../../tests/catalog";
import { formatTemp, getConditionLabel } from "./utils";

const tools = languageTools(language("weather", "en"));

describe("getConditionLabel", () => {
  it("turns raw Home Assistant states into homeowner copy", () => {
    expect(getConditionLabel(tools, "partlycloudy")).toBe("Partly cloudy");
    expect(getConditionLabel(tools, "clear-night")).toBe("Clear");
    expect(getConditionLabel(tools, "snowy-rainy")).toBe("Sleet");
  });

  it("prettifies an unknown state instead of showing it raw", () => {
    expect(getConditionLabel(tools, "blowing-snow")).toBe("Blowing snow");
    expect(getConditionLabel(tools, "")).toBe("");
  });
});

describe("formatTemp", () => {
  it("writes below-zero readings with a minus sign", () => {
    expect(formatTemp(tools, -2.4)).toBe("\u22122\u00B0");
    expect(formatTemp(tools, 21.6)).toBe("22\u00B0");
  });
});
