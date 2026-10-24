import { describe, expect, it } from "bun:test";
import type { EntityView } from "@glasshome/widget-sdk";
import { coverKind, doorKind, excludeEntities, groupEntitiesByDomain } from "./utils";

const entity = (id: string) =>
  ({ id, domain: id.split(".")[0], state: "on" }) as unknown as EntityView;

const none = {
  domains: [],
  lights: [],
  switches: [],
  covers: [],
  climate: [],
  sensors: [],
  binarySensors: [],
};

describe("area exclusions", () => {
  const all = [entity("light.a"), entity("light.b"), entity("sensor.t"), entity("switch.s")];

  it("keeps everything when nothing is excluded", () => {
    expect(excludeEntities(all, none)).toEqual(all);
  });

  it("keeps everything for a config saved before exclusions existed", () => {
    expect(excludeEntities(all, undefined)).toEqual(all);
    expect(excludeEntities(all, {})).toEqual(all);
    expect(excludeEntities(all, { lights: ["light.a"] }).map((e) => e.id)).toEqual([
      "light.b",
      "sensor.t",
      "switch.s",
    ]);
  });

  it("drops listed entities and whole hidden domains", () => {
    const left = excludeEntities(all, { ...none, lights: ["light.a"], domains: ["sensor"] });
    expect(left.map((e) => e.id)).toEqual(["light.b", "switch.s"]);
  });
});

const cover = (id: string, deviceClass?: string) =>
  ({ id, domain: "cover", state: "closed", deviceClass }) as unknown as EntityView;

describe("area covers", () => {
  it("keeps garage doors, gates and doors out of the window coverings", () => {
    const g = groupEntitiesByDomain([
      cover("cover.garage", "garage"),
      cover("cover.gate", "gate"),
      cover("cover.blind", "blind"),
      cover("cover.plain"),
    ]);
    expect(g.doors.map((e) => e.id)).toEqual(["cover.garage", "cover.gate"]);
    expect(g.covers.map((e) => e.id)).toEqual(["cover.blind", "cover.plain"]);
  });

  it("names coverings by their shared kind, and blinds when mixed", () => {
    expect(coverKind([cover("a", "curtain"), cover("b", "curtain")]).many).toBe("Curtains");
    expect(coverKind([cover("a", "curtain"), cover("b", "shade")]).many).toBe("Blinds");
    expect(doorKind([cover("a", "garage")]).one).toBe("Garage door");
  });
});
