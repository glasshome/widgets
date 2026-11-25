import { describe, expect, test } from "bun:test";
import { languageTools } from "@glasshome/widget-sdk/testing/tools";
import { language } from "../../tests/catalog";
import { coverJoinsBulk, groupLine } from "./group";

const GROUP_UNLOCKED = {
  all: "common.group.all-unlocked",
  none: "common.group.all-locked",
  some: "common.group.some-unlocked",
};
const tools = languageTools(language("lock", "en"));

describe("groupLine", () => {
  test("names the shared state when every member agrees", () => {
    expect(groupLine(tools, 0, 2, GROUP_UNLOCKED)).toBe("All locked");
    expect(groupLine(tools, 2, 2, GROUP_UNLOCKED)).toBe("All unlocked");
  });

  test("counts the members in the active state when they differ", () => {
    expect(groupLine(tools, 1, 2, GROUP_UNLOCKED)).toBe("1 of 2 unlocked");
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
