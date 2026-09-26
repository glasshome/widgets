import { describe, expect, test } from "bun:test";
import type { EntityView } from "@glasshome/widget-sdk";
import { batteryName } from "./utils";

const named = (friendlyName: string) => ({ id: "sensor.x_battery", friendlyName }) as EntityView;

describe("batteryName", () => {
  test("drops the word battery, which every row on the list shares", () => {
    expect(batteryName(named("Motion Sensor Battery"))).toBe("Motion Sensor");
    expect(batteryName(named("Door Lock battery level"))).toBe("Door Lock");
    expect(batteryName(named("Battery Hall Remote"))).toBe("Hall Remote");
  });

  test("keeps a name that is only the word", () => {
    expect(batteryName(named("Battery"))).toBe("Battery");
  });
});
