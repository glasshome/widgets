import { render } from "@solidjs/testing-library";
import type { EntityView } from "@glasshome/widget-sdk";
import { WidgetLanguage } from "@glasshome/widget-sdk/testing";
import { describe, expect, test } from "vitest";
import { EnergyEmptyState } from "../../src/_energy-shared";
import { LightColour } from "../../src/common/light-colour";
import { catalogsOf, language } from "../catalog";

const word = (dir: string, tag: string, key: string): string => {
  const parts = catalogsOf(dir)[tag]?.[key];
  if (parts?.length !== 1 || typeof parts[0] !== "string") throw new Error(`${dir} ${tag} ${key}`);
  return parts[0];
};

const lamp = {
  id: "light.desk",
  domain: "light",
  state: "on",
  attributes: { supported_color_modes: ["color_temp"] },
} as unknown as EntityView;

describe("shared words follow the member's language", () => {
  test("the energy empty state reads French from the energy-flow catalog", () => {
    const view = render(() => (
      <WidgetLanguage {...language("energy-flow", "fr")}>
        <EnergyEmptyState kind="unconfigured" />
      </WidgetLanguage>
    ));
    expect(view.getByText(word("energy-flow", "fr", "energy.empty.title"))).toBeTruthy();
  });

  test("the energy empty state reads English with no catalog", () => {
    const view = render(() => (
      <WidgetLanguage {...language("energy-flow", "en")}>
        <EnergyEmptyState kind="unconfigured" />
      </WidgetLanguage>
    ));
    expect(view.getByText("Set up your energy sensors")).toBeTruthy();
  });

  test("the colour picker names Warm white in German from the light catalog", () => {
    const view = render(() => (
      <WidgetLanguage {...language("light", "de")}>
        <LightColour lamps={[lamp]} />
      </WidgetLanguage>
    ));
    expect(view.getByLabelText(word("light", "de", "common.light-colour.warm-white"))).toBeTruthy();
  });

  test("the colour picker names Warm white in English with no catalog", () => {
    const view = render(() => (
      <WidgetLanguage {...language("light", "en")}>
        <LightColour lamps={[lamp]} />
      </WidgetLanguage>
    ));
    expect(view.getByLabelText("Warm white")).toBeTruthy();
  });
});
