import type { WeatherForecast } from "@glasshome/widget-sdk";
import { render } from "@solidjs/testing-library";
import { describe, expect, test } from "vitest";
import { HourChart } from "../../src/weather/hour-chart";
import { WeatherSky } from "../../src/weather/sky";

const FPS = 12;

const rainy: WeatherForecast[] = Array.from({ length: 12 }, (_, i) => ({
  datetime: new Date(Date.UTC(2026, 0, 5, i)).toISOString(),
  temperature: 8 + i,
  condition: "rainy",
  precipitation_probability: 80,
}));

const num = (el: Element, name: string) =>
  Number.parseFloat((el as HTMLElement).style.getPropertyValue(name));

/** A loop's step edges, in ticks of the shared frame rate: whole numbers when it paints on the grid. */
const onGrid = (el: Element, dur: string, delay?: string) => {
  const steps = num(el, "--wx-steps");
  expect(Number.isInteger(steps)).toBe(true);
  expect(steps).toBeGreaterThan(0);
  expect(num(el, dur) * FPS).toBeCloseTo(steps, 6);
  if (delay) expect(num(el, delay) * FPS).toBeCloseTo(Math.round(num(el, delay) * FPS), 6);
};

describe("ambient loops step on one frame grid", () => {
  test("rain over the hour chart", () => {
    const view = render(() => <HourChart hours={rainy} labelEvery={6} />);
    const drops = [...view.container.querySelectorAll(".wx-chart-drops")];
    expect(drops).toHaveLength(2);
    for (const el of drops) onGrid(el, "--wx-drop-t");
  });

  test("the layers of a rainy sky", () => {
    const view = render(() => <WeatherSky condition="rainy" wintry={false} />);
    const layers = [...view.container.querySelectorAll<HTMLElement>(".wx-fall")];
    expect(layers.length).toBeGreaterThan(1);
    for (const el of layers) onGrid(el, "--wx-dur", "--wx-delay");
  });

  test("the fog drifts", () => {
    const view = render(() => <WeatherSky condition="fog" wintry={false} />);
    const layers = [...view.container.querySelectorAll<HTMLElement>(".wx-fog")];
    expect(layers).toHaveLength(2);
    for (const el of layers) onGrid(el, "--wx-dur", "--wx-delay");
  });
});
