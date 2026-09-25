import { describe, expect, test } from "bun:test";
import { outlook } from "./outlook";

const at = (h: number, m = 0) => new Date(2026, 8, 25, h, m).toISOString();

describe("outlook", () => {
  test("reads Nord Pool slots and keeps the next whole hours", () => {
    const attrs = {
      raw_today: [
        { start: at(13), value: 0.3 },
        { start: at(14), value: 0.2 },
        { start: at(15), value: 0.1 },
      ],
      raw_tomorrow: [],
    };
    const hours = outlook(attrs, new Date(2026, 8, 25, 13, 20), 4);
    expect(hours.map((h) => h.price)).toEqual([0.2, 0.1]);
    expect(hours[0]?.start.getHours()).toBe(14);
  });

  test("averages quarter-hour slots into their hour", () => {
    const attrs = {
      raw_today: [
        { start: at(14, 0), value: 0.1 },
        { start: at(14, 15), value: 0.2 },
        { start: at(14, 30), value: 0.3 },
        { start: at(14, 45), value: 0.4 },
      ],
    };
    const [hour] = outlook(attrs, new Date(2026, 8, 25, 13, 0));
    expect(hour?.price).toBeCloseTo(0.25);
  });

  test("reads ENTSO-e prices and ignores junk", () => {
    const attrs = { prices: [{ time: at(16), price: 0.12 }, { time: "nope", price: 1 }, null] };
    expect(outlook(attrs, new Date(2026, 8, 25, 15, 0)).map((h) => h.price)).toEqual([0.12]);
  });

  test("no forecast, no outlook", () => {
    expect(outlook({ unit_of_measurement: "EUR/kWh" }, new Date())).toEqual([]);
  });
});
