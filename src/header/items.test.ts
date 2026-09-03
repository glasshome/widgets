import { describe, expect, test } from "bun:test";
import { DOMAIN_SPECS, resolveItem, visibleCount } from "./items";

const entities = [
  { id: "light.kitchen", state: "on", name: "Kitchen light" },
  { id: "light.hall", state: "off", name: "Hall light" },
  { id: "lock.front", state: "unlocked", name: "Front door" },
  { id: "sensor.power", state: "412", name: "Power", unit: "W", icon: "mdi:flash" },
];

describe("resolveItem", () => {
  test("a status item counts the domain's active entities and carries its action", () => {
    const r = resolveItem({ kind: "status", domain: "light", scope: "home" }, entities);
    expect(r).toMatchObject({
      kind: "status",
      value: "1",
      word: "on",
      ids: ["light.kitchen"],
      service: { domain: "light", name: "turn_off" },
    });
  });

  test("a status item with nothing active resolves to nothing", () => {
    const quiet = [{ id: "light.hall", state: "off", name: "Hall light" }];
    expect(resolveItem({ kind: "status", domain: "light", scope: "home" }, quiet)).toBeNull();
  });

  test("an entity item shows its state and unit", () => {
    const r = resolveItem({ kind: "entity", entityId: ["sensor.power"] }, entities);
    expect(r).toMatchObject({ kind: "entity", value: "412 W", icon: "mdi:flash" });
  });

  test("an entity item with no entity resolves to nothing", () => {
    expect(resolveItem({ kind: "entity", entityId: [] }, entities)).toBeNull();
    expect(resolveItem({ kind: "entity", entityId: ["sensor.gone"] }, entities)).toBeNull();
  });

  test("an action item always resolves, and calls the right service", () => {
    const r = resolveItem(
      { kind: "action", entityId: ["scene.movie"], label: "Movie", icon: "mdi:movie" },
      entities,
    );
    expect(r).toMatchObject({
      kind: "action",
      label: "Movie",
      icon: "mdi:movie",
      service: { domain: "scene", name: "turn_on" },
      ids: ["scene.movie"],
    });
  });

  test("every domain spec names an active state and a batch service", () => {
    for (const spec of Object.values(DOMAIN_SPECS)) {
      expect(spec.activeState.length).toBeGreaterThan(0);
      expect(spec.service.name.length).toBeGreaterThan(0);
    }
  });
});

describe("visibleCount", () => {
  test("keeps what fits, dropping from the end", () => {
    expect(visibleCount(900, 3)).toBe(3);
    expect(visibleCount(560, 3)).toBe(2);
    expect(visibleCount(300, 3)).toBe(0);
  });

  test("an unmeasured tile shows everything", () => {
    expect(visibleCount(0, 4)).toBe(4);
  });
});
