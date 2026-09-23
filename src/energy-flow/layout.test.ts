import { describe, expect, test } from "bun:test";
import { selectTier } from "./layout";

describe("selectTier", () => {
  test("short heights are glance regardless of width", () => {
    expect(selectTier(800, 120)).toBe("glance");
    expect(selectTier(200, 149)).toBe("glance");
  });

  test("comfortable size is full", () => {
    expect(selectTier(340, 230)).toBe("full");
    expect(selectTier(600, 400)).toBe("full");
  });

  test("in-between is mid", () => {
    expect(selectTier(300, 200)).toBe("mid");
    expect(selectTier(339, 400)).toBe("mid");
    expect(selectTier(600, 229)).toBe("mid");
  });
});
