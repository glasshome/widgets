import { describe, expect, it } from "bun:test";
import { activeIds, CHIPS } from "./status";

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
