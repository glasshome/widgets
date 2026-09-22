import { describe, expect, it } from "bun:test";
import { shiftBand } from "./use-setpoints";

describe("shiftBand", () => {
  it("moves every setpoint by the delta, keeping the gap", () => {
    expect(shiftBand([20, 24], 1.5, 7, 35)).toEqual([21.5, 25.5]);
  });

  it("stops the band at the top of the range without squeezing it", () => {
    expect(shiftBand([30, 34], 3, 7, 35)).toEqual([31, 35]);
  });

  it("stops the band at the bottom of the range without squeezing it", () => {
    expect(shiftBand([8, 12], -4, 7, 35)).toEqual([7, 11]);
  });

  it("moves a single setpoint too", () => {
    expect(shiftBand([22], -0.5, 7, 35)).toEqual([21.5]);
  });
});
