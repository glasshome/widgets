import { describe, expect, it } from "bun:test";
import { greetingKey } from "./greeting";

describe("greetingKey", () => {
  it("keeps today's boundaries", () => {
    expect(greetingKey(4)).toBe("header.greeting.night");
    expect(greetingKey(5)).toBe("header.greeting.morning");
    expect(greetingKey(11)).toBe("header.greeting.morning");
    expect(greetingKey(12)).toBe("header.greeting.afternoon");
    expect(greetingKey(17)).toBe("header.greeting.afternoon");
    expect(greetingKey(18)).toBe("header.greeting.evening");
    expect(greetingKey(23)).toBe("header.greeting.evening");
  });
});
