import { describe, expect, test } from "bun:test";
import { selectTier } from "./layout";

describe("selectTier", () => {
  test("short heights are glance regardless of width", () => {
    expect(selectTier(800, 120)).toBe("glance");
    expect(selectTier(200, 149)).toBe("glance");
  });

  test("comfortable size is full", () => {
    expect(selectTier(360, 300)).toBe("full");
    expect(selectTier(600, 400)).toBe("full");
  });

  test("in-between is mid", () => {
    expect(selectTier(300, 200)).toBe("mid");
    expect(selectTier(359, 299)).toBe("mid");
  });
});
