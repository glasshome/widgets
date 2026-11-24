import type { WeatherForecast } from "@glasshome/widget-sdk";
import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, test } from "vitest";
import { HourChart } from "../../src/weather/hour-chart";

const CONDITIONS = [
  ...Array.from({ length: 6 }, () => "sunny"),
  ...Array.from({ length: 6 }, () => "cloudy"),
  ...Array.from({ length: 11 }, () => "rainy"),
  "snowy",
];

function forecast(length: number, tempAt = (i: number) => 10 + i): WeatherForecast[] {
  return Array.from({ length }, (_, i) => ({
    datetime: new Date(Date.UTC(2026, 0, 5, i)).toISOString(),
    temperature: tempAt(i),
    condition: CONDITIONS[i] ?? "rainy",
    precipitation_probability: i >= 12 && i < 23 ? 60 : 0,
  }));
}

const hourLabel = (hours: WeatherForecast[], i: number) =>
  i === 0
    ? "Now"
    : new Date(hours[i]?.datetime ?? "").toLocaleTimeString(undefined, { hour: "numeric" });

function mount(hours: WeatherForecast[], labelEvery: number) {
  const [current, setHours] = createSignal(hours);
  const view = render(() => <HourChart hours={current()} labelEvery={labelEvery} />);
  const chart = () => view.container.querySelector(".wx-chart") as HTMLElement;
  const points = () => [...chart().querySelectorAll<HTMLElement>(".wx-chart-point")];
  const times = () => [...chart().querySelectorAll<HTMLElement>(".wx-chart-time")];
  const read = () => ({
    lefts: points().map((p) => p.style.left),
    times: times().map((t) => t.textContent),
    temps: points().map((p) => p.querySelector(".wx-temp")?.textContent),
    icons: points().map((p) => {
      const icon = p.querySelector("iconify-icon, [data-slot='icon']");
      return icon?.getAttribute("data-icon") ?? icon?.getAttribute("icon") ?? null;
    }),
    edges: points().map((p) => p.dataset.edge ?? null),
    timeEdges: times().map((t) => t.dataset.edge ?? null),
    now: points().map((p) => p.dataset.now ?? null),
  });
  return { chart, points, times, read, setHours };
}

describe("HourChart labels", () => {
  test("labels every sixth hour and the last one when it sits past the half step", () => {
    const hours = forecast(24);
    const { read } = mount(hours, 6);
    expect(read()).toEqual({
      lefts: ["4%", "28%", "52%", "76%", "96%"],
      times: [0, 6, 12, 18, 23].map((i) => hourLabel(hours, i)),
      temps: ["10°", "16°", "22°", "28°", "33°"],
      icons: [
        "mdi:weather-sunny",
        "mdi:weather-cloudy",
        "mdi:weather-pouring",
        null,
        "mdi:weather-snowy",
      ],
      edges: ["start", null, null, null, "end"],
      timeEdges: ["start", null, null, null, "end"],
      now: ["true", null, null, null, null],
    });
    expect(hourLabel(hours, 0)).toBe("Now");
  });

  test("leaves the last hour unlabelled when it sits within half a step of a label", () => {
    const hours = forecast(22);
    const { read } = mount(hours, 6);
    expect(read().lefts.map((left) => Number.parseFloat(left).toFixed(3))).toEqual([
      "4.000",
      "30.286",
      "56.571",
      "82.857",
    ]);
    expect(read().times).toEqual([0, 6, 12, 18].map((i) => hourLabel(hours, i)));
  });

  test("labels every hour when the step is one", () => {
    const hours = forecast(24);
    const { points, times } = mount(hours, 1);
    expect(points()).toHaveLength(24);
    expect(times().map((t) => t.textContent)).toEqual(hours.map((_, i) => hourLabel(hours, i)));
  });

  test("renders each labelled hour's point then its time, in hour order", () => {
    const { chart } = mount(forecast(24), 6);
    const order = [...chart().children]
      .filter((el) => el.matches(".wx-chart-point, .wx-chart-time"))
      .map((el) => el.className);
    expect(order).toEqual(
      Array.from({ length: 5 }, () => ["wx-chart-point", "wx-chart-time wx-label"]).flat(),
    );
  });

  test("keeps the same label nodes and updates their values when the forecast changes", () => {
    const { points, times, read, setHours } = mount(forecast(24), 6);
    const before = { points: points(), times: times() };
    setHours(forecast(24, (i) => 20 + i));
    expect(points()).toEqual(before.points);
    expect(times()).toEqual(before.times);
    expect(read().temps).toEqual(["20°", "26°", "32°", "38°", "43°"]);
  });

  test("follows the labelled set when the step changes", () => {
    const hours = forecast(24);
    const [every, setEvery] = createSignal(6);
    const view = render(() => <HourChart hours={hours} labelEvery={every()} />);
    const times = () =>
      [...view.container.querySelectorAll(".wx-chart-time")].map((t) => t.textContent);
    expect(times()).toEqual([0, 6, 12, 18, 23].map((i) => hourLabel(hours, i)));
    setEvery(12);
    expect(times()).toEqual([0, 12, 23].map((i) => hourLabel(hours, i)));
    setEvery(6);
    expect(times()).toEqual([0, 6, 12, 18, 23].map((i) => hourLabel(hours, i)));
  });
});
