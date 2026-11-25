import { render } from "@solidjs/testing-library";
import type { EntityView, WeatherForecast } from "@glasshome/widget-sdk";
import { WidgetLanguage } from "@glasshome/widget-sdk/testing";
import { languageTools, type TestLanguage } from "@glasshome/widget-sdk/testing/tools";
import { useFakeTime } from "@glasshome/ui/testing";
import { describe, expect, test, vi } from "vitest";
import { buildPills, temperatureText } from "../../src/area/words";
import { AreaSheet } from "../../src/area/sheet";
import { calculateMetrics, groupEntitiesByDomain } from "../../src/area/utils";
import { resolveChip } from "../../src/header/items";
import { GreetingLine } from "../../src/header/greeting-line";
import { weatherDetails } from "../../src/weather/details";
import { dayRange } from "../../src/weather/sheet";
import { getConditionLabel } from "../../src/weather/utils";
import { catalogsOf, language } from "../catalog";

const tools = (dir: string, tag: "en" | "fr" | "de") => languageTools(language(dir, tag));

const word = (dir: string, tag: string, key: string): string => {
  const parts = catalogsOf(dir)[tag]?.[key];
  if (parts?.length !== 1 || typeof parts[0] !== "string") throw new Error(`${dir} ${tag} ${key}`);
  return parts[0];
};

const withStates = (base: TestLanguage, state: string, text: string): TestLanguage => ({
  ...base,
  states: { component: { weather: { _: { state: { [state]: text } } } }, entity: {} },
});

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

describe("header", () => {
  test("the header greets in French at 9 in the morning", () => {
    useFakeTime();
    vi.setSystemTime(new Date(2026, 10, 25, 9, 0, 0));
    const view = render(() => (
      <WidgetLanguage {...language("header", "fr")}>
        <GreetingLine />
      </WidgetLanguage>
    ));
    expect(view.container.textContent).toBe(word("header", "fr", "header.greeting.morning"));
  });

  test("the header greets by name in German in the evening", () => {
    useFakeTime();
    vi.setSystemTime(new Date(2026, 10, 25, 19, 0, 0));
    const view = render(() => (
      <WidgetLanguage {...language("header", "de")}>
        <GreetingLine name="Nina" />
      </WidgetLanguage>
    ));
    expect(view.container.textContent).toBe(
      tools("header", "de").t("header.greeting.named", {
        greeting: word("header", "de", "header.greeting.evening"),
        name: "Nina",
      }),
    );
  });

  test("the header greets in English with no catalog", () => {
    useFakeTime();
    vi.setSystemTime(new Date(2026, 10, 25, 2, 0, 0));
    const view = render(() => (
      <WidgetLanguage {...language("header", "en")}>
        <GreetingLine name="Nina" />
      </WidgetLanguage>
    ));
    expect(view.container.textContent).toBe("Good night, Nina");
  });
});

describe("header value chip", () => {
  const reading = (state: string, unit?: string, deviceClass?: string) => ({
    id: "sensor.room",
    state,
    name: "Room",
    unit,
    deviceClass,
  });
  const chip = { shows: "value", entityId: ["sensor.room"] } as const;
  const de = (states = false): TestLanguage => ({
    ...language("header", "de"),
    states: states
      ? {
          component: { sensor: { _: { state: { idle: "Leerlauf" } } } },
          entity: {},
        }
      : null,
  });

  test("a numeric reading takes the German number format and its unit", () => {
    const value = resolveChip(chip, [reading("21.5", "°C")], languageTools(de()))?.value;
    expect(value).toBe("21,5 °C");
  });

  test("a numeric reading keeps English format", () => {
    const value = resolveChip(chip, [reading("21.5", "°C")], tools("header", "en"))?.value;
    expect(value).toBe("21.5 °C");
  });

  test("a word state takes Home Assistant's German word", () => {
    const value = resolveChip(chip, [reading("idle")], languageTools(de(true)))?.value;
    expect(value).toBe("Leerlauf");
  });

  test("a word state stays as it is in English with no texts", () => {
    expect(resolveChip(chip, [reading("idle")], tools("header", "en"))?.value).toBe("idle");
  });
});

describe("weather", () => {
  const partly = (base: TestLanguage) => getConditionLabel(languageTools(base), "partlycloudy");

  test("weather names partly cloudy with HA's word", () => {
    const fr = withStates(language("weather", "fr"), "partlycloudy", "Partiellement nuageux");
    expect(partly(fr)).toBe("Partiellement nuageux");
  });

  test("weather names partly cloudy from its catalog when HA has none", () => {
    expect(partly(language("weather", "fr"))).toBe(
      word("weather", "fr", "weather.condition.partly-cloudy"),
    );
  });

  test("weather spells out a state nobody has a word for", () => {
    expect(getConditionLabel(tools("weather", "fr"), "blowing-snow")).toBe("Blowing snow");
  });

  test("the forecast writes 1.013 hPa in German", () => {
    const attrs: Record<string, unknown> = { pressure: 1013.4, apparent_temperature: -2.4 };
    const de = tools("weather", "de");
    const details = weatherDetails(de, <T,>(key: string) => attrs[key] as T | undefined);
    expect(details.map((d) => d.value)).toEqual(["−2°", "1.013 hPa"]);
    expect(details[1]?.label).toBe(word("weather", "de", "weather.detail.pressure"));
  });

  test("the forecast writes the rain chance as a German percentage", () => {
    const day: WeatherForecast = {
      datetime: "2026-11-26T12:00:00Z",
      temp_high: 12,
      temp_low: 3,
      precipitation_probability: 35,
    };
    const de = tools("weather", "de");
    expect(dayRange(de, day)).toBe(
      de.t("weather.sheet.day-range-rain", {
        high: "12°",
        low: "3°",
        chance: de.formatNumber(0.35, { style: "percent" }),
      }),
    );
    expect(de.formatNumber(0.35, { style: "percent" })).toBe("35 %");
  });

  test("the forecast leaves the rain out below 20 percent in English", () => {
    const day: WeatherForecast = {
      datetime: "2026-11-26T12:00:00Z",
      temp_high: 12,
      temp_low: 3,
      precipitation_probability: 10,
    };
    expect(dayRange(tools("weather", "en"), day)).toBe("12° / 3°");
  });
});

describe("area", () => {
  const sensor = (state: string, deviceClass: string, unit: string) =>
    entity(`sensor.${deviceClass}`, state, { deviceClass, unitOfMeasurement: unit });
  const metricsOf = (entities: EntityView[]) => calculateMetrics(groupEntitiesByDomain(entities));

  test("area reads 21,5 °C in German", () => {
    const metrics = metricsOf([sensor("21.5", "temperature", "°C")]);
    expect(temperatureText(tools("area", "de"), metrics)).toBe(
      tools("area", "de").formatTemperature(21.5, { unit: "°C", digits: 1 }),
    );
    expect(temperatureText(tools("area", "de"), metrics)).toBe("21,5 °C");
  });

  test("area keeps Fahrenheit for a Fahrenheit sensor", () => {
    const metrics = metricsOf([sensor("70.7", "temperature", "°F")]);
    expect(temperatureText(tools("area", "en"), metrics)).toBe("70.7 °F");
  });

  test("area names its lights pill in French from the area catalog", () => {
    const entities = [entity("light.a", "on"), entity("light.b", "off")];
    const groups = groupEntitiesByDomain(entities);
    const [pill] = buildPills(tools("area", "fr"), calculateMetrics(groups), groups);
    const fr = tools("area", "fr");
    expect(pill?.label).toBe(word("area", "fr", "area.pill.lights"));
    expect(pill?.short).toBe(fr.t("area.pill.lights-on", { count: 1 }));
    expect(pill?.state).toBe(fr.t("area.pill.lights-some-on", { on: 1, total: 2 }));
  });

  test("area names its covers by kind in German", () => {
    const entities = [entity("cover.a", "open", { deviceClass: "curtain" })];
    const groups = groupEntitiesByDomain(entities);
    const [pill] = buildPills(tools("area", "de"), calculateMetrics(groups), groups);
    expect(pill?.label).toBe(tools("area", "de").t("area.kind.curtain", { count: 1 }));
    expect(pill?.state).toBe(word("area", "de", "area.state.open"));
  });

  test("area names its covers in English with no catalog", () => {
    const entities = [
      entity("cover.a", "closed", { deviceClass: "curtain" }),
      entity("cover.b", "closed", { deviceClass: "curtain" }),
    ];
    const groups = groupEntitiesByDomain(entities);
    const [pill] = buildPills(tools("area", "en"), calculateMetrics(groups), groups);
    expect(pill?.label).toBe("Curtains");
    expect(pill?.state).toBe("Closed");
  });

  test("area sheet reads its sections and sensor facts in German", () => {
    const area = {
      id: "living",
      name: "Wohnzimmer",
      entities: [
        entity("scene.movie", "scening", { friendlyName: "Film" }),
        entity("binary_sensor.window", "on", { deviceClass: "window", friendlyName: "Fenster" }),
      ],
    } as unknown as Parameters<typeof AreaSheet>[0]["area"];
    const groups = groupEntitiesByDomain(area.entities);
    const view = render(() => (
      <WidgetLanguage {...language("area", "de")}>
        <AreaSheet area={area} metrics={calculateMetrics(groups)} />
      </WidgetLanguage>
    ));
    expect(view.getByText(word("area", "de", "area.sheet.scenes"))).toBeTruthy();
    expect(view.getByText(word("area", "de", "area.sheet.sensors"))).toBeTruthy();
    expect(view.getByText(word("area", "de", "area.fact.open"))).toBeTruthy();
  });
});
