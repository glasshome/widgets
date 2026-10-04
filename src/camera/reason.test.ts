import { describe, expect, test } from "bun:test";
import { reasonOf } from "./reason";

describe("reasonOf", () => {
  test("reads an Error's message", () => {
    expect(reasonOf(new Error("offer timed out"))).toBe("offer timed out");
  });

  test("reads the message of a Home Assistant command error", () => {
    expect(reasonOf({ code: "not_supported", message: "Stream not supported" })).toBe(
      "Stream not supported",
    );
  });

  test("falls back to the code, then to String", () => {
    expect(reasonOf({ code: "not_found" })).toBe("code not_found");
    expect(reasonOf(3)).toBe("3");
  });
});
