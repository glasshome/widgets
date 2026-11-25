import { describe, expect, test } from "bun:test";
import { migrateClock } from "./migrate";

describe("migrateClock", () => {
  test("old defaults become auto", () => {
    expect(
      migrateClock({ dateFormat: "MM/DD/YYYY", timeFormat: "24", preset: "modern" }, 1),
    ).toEqual({ dateFormat: "auto", timeFormat: "auto", preset: "modern" });
  });

  test("a real choice stays", () => {
    expect(migrateClock({ dateFormat: "DD/MM/YYYY", timeFormat: "12" }, 1)).toEqual({
      dateFormat: "DD/MM/YYYY",
      timeFormat: "12",
    });
  });

  test("YYYY-MM-DD stays", () => {
    expect(migrateClock({ dateFormat: "YYYY-MM-DD", timeFormat: "24" }, 1)).toEqual({
      dateFormat: "YYYY-MM-DD",
      timeFormat: "auto",
    });
  });

  test("a config already at 2 is untouched", () => {
    const saved = { dateFormat: "MM/DD/YYYY", timeFormat: "24" };
    expect(migrateClock(saved, 2)).toEqual(saved);
  });
});
