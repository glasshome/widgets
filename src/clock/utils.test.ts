import { describe, expect, it } from "bun:test";
import { greetingForHour } from "./utils";

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
