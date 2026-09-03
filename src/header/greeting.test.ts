import { describe, expect, it } from "bun:test";
import { greetingForHour, hourIn } from "./greeting";

describe("greetingForHour", () => {
  it("buckets the day the way the old header did", () => {
    expect(greetingForHour(0)).toBe("Good night");
    expect(greetingForHour(4)).toBe("Good night");
    expect(greetingForHour(5)).toBe("Good morning");
    expect(greetingForHour(11)).toBe("Good morning");
    expect(greetingForHour(12)).toBe("Good afternoon");
    expect(greetingForHour(17)).toBe("Good afternoon");
    expect(greetingForHour(18)).toBe("Good evening");
    expect(greetingForHour(23)).toBe("Good evening");
  });
});

describe("hourIn", () => {
  it("reads the hour in the given zone, midnight as 0", () => {
    const d = new Date("2026-09-03T00:30:00Z");
    expect(hourIn(d, "UTC")).toBe(0);
    expect(hourIn(d, "Asia/Tokyo")).toBe(9);
  });
});
