import { describe, expect, it } from "bun:test";
import type { EntityView } from "@glasshome/widget-sdk";
import { coverKind, doorKind, groupEntitiesByDomain } from "./utils";

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
