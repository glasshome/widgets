import { describe, expect, it } from "bun:test";
import { activeIds, CHIPS, needsArea } from "./status";

const lights = [
  { id: "light.a", state: "on" },
  { id: "light.b", state: "off" },
  { id: "light.c", state: "unavailable" },
];
const locks = [
  { id: "lock.front", state: "unlocked" },
  { id: "lock.back", state: "locked" },
];

describe("activeIds", () => {
  it("counts lights that are on", () => {
    expect(activeIds(CHIPS.lights, lights)).toEqual(["light.a"]);
  });
  it("counts locks that are unlocked", () => {
    expect(activeIds(CHIPS.locks, locks)).toEqual(["lock.front"]);
  });
  it("ignores entities of another domain", () => {
    expect(activeIds(CHIPS.lights, locks)).toEqual([]);
  });
});

describe("needsArea", () => {
  it("is true for area scope with no areaId", () => {
    expect(needsArea({ scope: "area" })).toBe(true);
  });
  it("is false for area scope with an areaId", () => {
    expect(needsArea({ scope: "area", areaId: "living_room" })).toBe(false);
  });
  it("is false for non-area scopes", () => {
    expect(needsArea({ scope: "home" })).toBe(false);
    expect(needsArea({ scope: "dashboard" })).toBe(false);
  });
});
