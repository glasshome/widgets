import { describe, expect, test } from "bun:test";
import { coverJoinsBulk, groupLine } from "./group";

const LOCK = { active: "unlocked", rest: "locked" };

describe("groupLine", () => {
  test("names the shared state when every member agrees", () => {
    expect(groupLine(0, 2, LOCK)).toBe("All locked");
    expect(groupLine(2, 2, LOCK)).toBe("All unlocked");
  });

  test("counts the members in the active state when they differ", () => {
    expect(groupLine(1, 2, LOCK)).toBe("1 of 2 unlocked");
  });
});

describe("coverJoinsBulk", () => {
  test("blinds and shutters join, doors, gates, garage doors and unclassed covers do not", () => {
    expect(coverJoinsBulk({ deviceClass: "blind" })).toBe(true);
    expect(coverJoinsBulk({ deviceClass: "shutter" })).toBe(true);
    for (const deviceClass of ["door", "gate", "garage"]) {
      expect(coverJoinsBulk({ deviceClass })).toBe(false);
    }
    expect(coverJoinsBulk({ deviceClass: null })).toBe(false);
    expect(coverJoinsBulk({})).toBe(false);
  });
});
