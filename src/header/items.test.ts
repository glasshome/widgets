import { describe, expect, test } from "bun:test";
import { DOMAIN_SPECS, needsArea, resolveChip, visibleCount, WATCH_DOMAIN } from "./items";

const hallOff = { id: "light.hall", state: "off", name: "Hall light" };
const entities = [
  { id: "light.kitchen", state: "on", name: "Kitchen light" },
  hallOff,
  { id: "lock.front", state: "unlocked", name: "Front door" },
  { id: "sensor.power", state: "412", name: "Power", unit: "W", icon: "mdi:flash" },
];

describe("resolveChip", () => {
  test("a counting chip counts what is on and taps to fix it", () => {
    expect(resolveChip({ shows: "lights" }, entities)).toMatchObject({
      value: "1",
      ids: ["light.kitchen"],
      service: { domain: "light", name: "turn_off" },
    });
  });

  test("a counting chip with nothing on shows nothing at all", () => {
    expect(resolveChip({ shows: "lights" }, [hallOff])).toBeNull();
  });

  test("only these counts just the entities named, ignoring the rest", () => {
    const kitchenOn = { id: "light.kitchen", state: "on" };
    const two = [kitchenOn, { id: "light.hall", state: "on" }];
    expect(resolveChip({ shows: "lights", only: ["light.kitchen"] }, two)).toMatchObject({
      value: "1",
      ids: ["light.kitchen"],
    });
    expect(resolveChip({ shows: "lights", only: [] }, two)).toMatchObject({ value: "2" });
    expect(resolveChip({ shows: "lights", only: ["light.hall"] }, [kitchenOn])).toBeNull();
  });

  test("every counting kind names a real domain", () => {
    for (const domain of Object.values(WATCH_DOMAIN)) {
      expect(DOMAIN_SPECS[domain]).toBeDefined();
    }
  });

  test("a value chip shows its value with the unit", () => {
    expect(resolveChip({ shows: "value", entityId: ["sensor.power"] }, entities)).toMatchObject({
      value: "412 W",
      icon: "mdi:flash",
    });
  });

  test("a value chip without its entity shows nothing", () => {
    expect(resolveChip({ shows: "value", entityId: ["sensor.gone"] }, entities)).toBeNull();
    expect(resolveChip({ shows: "value", entityId: [] }, entities)).toBeNull();
  });

  test("an action chip is icon only and runs its entity", () => {
    expect(resolveChip({ shows: "action", entityId: ["scene.movie"] }, entities)).toMatchObject({
      value: null,
      ids: ["scene.movie"],
      service: { domain: "scene", name: "turn_on" },
    });
  });

  test("an action chip on a domain nothing can run shows nothing", () => {
    expect(resolveChip({ shows: "action", entityId: ["sensor.power"] }, entities)).toBeNull();
  });

  test("every watched domain names a state and a service", () => {
    for (const spec of Object.values(DOMAIN_SPECS)) {
      expect(spec.activeState.length).toBeGreaterThan(0);
      expect(spec.service.name.length).toBeGreaterThan(0);
    }
  });
});

describe("visibleCount", () => {
  test("keeps what fits, dropping from the end", () => {
    expect(visibleCount(900, 3)).toBe(3);
    expect(visibleCount(430, 3)).toBe(2);
    expect(visibleCount(260, 3)).toBe(0);
  });

  test("an unmeasured tile shows everything", () => {
    expect(visibleCount(0, 4)).toBe(4);
  });
});

describe("needsArea", () => {
  test("area scope without an area is unconfigured, every other scope is fine", () => {
    expect(needsArea({ scope: "area" })).toBe(true);
    expect(needsArea({ scope: "area", areaId: "kitchen" })).toBe(false);
    expect(needsArea({ scope: "dashboard" })).toBe(false);
    expect(needsArea({ scope: "home" })).toBe(false);
  });
});
