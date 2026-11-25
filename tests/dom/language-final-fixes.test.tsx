import { render } from "@solidjs/testing-library";
import type { EntityView } from "@glasshome/widget-sdk";
import { WidgetLanguage } from "@glasshome/widget-sdk/testing";
import { languageTools } from "@glasshome/widget-sdk/testing/tools";
import { describe, expect, test } from "vitest";
import { AreaSheet } from "../../src/area/sheet";
import { calculateMetrics, groupEntitiesByDomain } from "../../src/area/utils";
import { buildPills } from "../../src/area/words";
import { groupOnLine } from "../../src/common/group-on";
import { formatMoney } from "../../src/_energy-shared/formatting";
import { SensorSheet } from "../../src/sensor/sheet";
import { binarySensorClass } from "../../src/binary-sensor/utils";
import { sensorClass } from "../../src/sensor/utils";
import { catalogsOf, language } from "../catalog";

const tools = (dir: string, tag: "en" | "fr" | "de") => languageTools(language(dir, tag));

const word = (dir: string, tag: string, key: string): string => {
  const parts = catalogsOf(dir)[tag]?.[key];
  if (parts?.length !== 1 || typeof parts[0] !== "string") throw new Error(`${dir} ${tag} ${key}`);
  return parts[0];
};

const entity = (id: string, state: string, extra: Record<string, unknown> = {}) =>
  ({
    id,
    domain: id.split(".")[0],
    state,
    platform: "",
    attributes: {},
    deviceClass: null,
    friendlyName: id,
    ...extra,
  }) as unknown as EntityView;

const thermostat = entity("climate.hall", "heat_cool", {
  friendlyName: "Flur",
  attributes: {
    hvac_modes: ["off", "heat", "cool", "heat_cool"],
    preset_modes: ["eco"],
    fan_modes: ["auto", "low"],
    target_temp_low: 19,
    target_temp_high: 24,
    current_temperature: 21,
    min_temp: 7,
    max_temp: 35,
  },
});

const digitsOut = (text: string) => text.replace(/\d+/g, "#");

describe("the area's thermostat sheet", () => {
  test("the area sheet words the thermostat in German, with no catalog key on screen", () => {
    const area = {
      id: "hall",
      name: "Flur",
      entities: [thermostat],
    } as unknown as Parameters<typeof AreaSheet>[0]["area"];
    const view = render(() => (
      <WidgetLanguage {...language("area", "de")}>
        <AreaSheet
          area={area}
          metrics={calculateMetrics(groupEntitiesByDomain(area.entities))}
          entry="climate.hall"
        />
      </WidgetLanguage>
    ));
    expect(view.getAllByText(word("area", "de", "climate.controls.mode")).length).toBeGreaterThan(
      0,
    );
    expect(view.getAllByText(word("area", "de", "climate.sheet.preset")).length).toBeGreaterThan(0);
    expect(view.getAllByText(word("area", "de", "climate.sheet.fan")).length).toBeGreaterThan(0);
    expect(view.container.textContent).not.toMatch(/\bclimate\.[a-z-]+\.[a-z-]+/);
  });

  test("the area pill and the climate widget word heat_cool the same way", () => {
    const groups = groupEntitiesByDomain([thermostat]);
    const de = tools("area", "de");
    const pill = buildPills(de, calculateMetrics(groups), groups).find(
      (p) => p.action === "climate",
    );
    expect(pill?.state.startsWith(word("climate", "de", "climate.mode.heat-cool"))).toBe(true);
  });
});

describe("a count takes a plural", () => {
  test("a group line of one reads differently from a group of two in French", () => {
    const fr = tools("light", "fr");
    expect(digitsOut(groupOnLine(fr, 1, 3))).not.toBe(digitsOut(groupOnLine(fr, 2, 3)));
  });

  test("the low-battery count reads differently for one and two in French", () => {
    const fr = tools("batteries", "fr");
    expect(digitsOut(fr.t("batteries.low", { count: 1 }))).not.toBe(
      digitsOut(fr.t("batteries.low", { count: 2 })),
    );
  });

  test("a group line in English keeps its words", () => {
    expect(groupOnLine(tools("light", "en"), 1, 3)).toBe("1 of 3 on");
  });
});

describe("money", () => {
  test("a German amount puts the number before the currency", () => {
    expect(formatMoney(0.45, "€", tools("energy-flow", "de"))).toBe("0,45\u00a0€");
  });

  test("an English amount keeps the currency first", () => {
    expect(formatMoney(0.45, "€", tools("energy-flow", "en"))).toBe("€0.45");
  });
});

describe("sensor words", () => {
  test("an unmapped device class reads the widget's generic name", () => {
    const de = tools("sensor", "de");
    expect(sensorClass(de, "wind_speed")).toBe(word("sensor", "de", "sensor.name"));
    expect(binarySensorClass(tools("binary-sensor", "de"), "a_class_no_map_names")).toBe(
      word("binary-sensor", "de", "binary-sensor.name"),
    );
  });

  test("the sensor sheet words an unavailable reading in German", () => {
    const view = render(() => (
      <WidgetLanguage {...language("sensor", "de")}>
        <SensorSheet entities={[entity("sensor.a", "unavailable", { friendlyName: "Aussen" })]} />
      </WidgetLanguage>
    ));
    expect(view.container.textContent).not.toContain("unavailable");
  });
});
