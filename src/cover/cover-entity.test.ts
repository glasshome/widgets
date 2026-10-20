import { describe, expect, it } from "bun:test";
import type { EntityView } from "@glasshome/widget-sdk";
import {
  getCoverCapabilities,
  getCoverMovement,
  getCoverPosition,
  getCoverTiltPosition,
  isCoverFullyClosed,
  isCoverFullyOpen,
  isCoverOpen,
} from "./cover-entity";

function makeCover(overrides: {
  state?: string;
  supportedFeatures?: number;
  attributes?: Record<string, unknown>;
}): EntityView {
  return {
    id: "cover.test",
    domain: "cover",
    state: overrides.state ?? "closed",
    attributes: overrides.attributes ?? {},
    lastChanged: new Date(0),
    lastUpdated: new Date(0),
    context: { id: "ctx", parentId: null, userId: null },
    name: "Test Cover",
    friendlyName: "Test Cover",
    areaId: null,
    deviceId: null,
    platform: "test",
    uniqueId: null,
    isDisabled: false,
    isHidden: false,
    icon: null,
    iconSource: "default",
    entityCategory: null,
    labels: [],
    aliases: [],
    supportedFeatures: overrides.supportedFeatures,
  };
}

describe("getCoverCapabilities", () => {
  it("decodes the full bitmask", () => {
    const caps = getCoverCapabilities(makeCover({ supportedFeatures: 255 }));
    expect(caps).toEqual({
      canOpen: true,
      canClose: true,
      canStop: true,
      canSetPosition: true,
      canOpenTilt: true,
      canCloseTilt: true,
      canStopTilt: true,
      canSetTiltPosition: true,
    });
  });

  it("garage door: open/close/stop without position", () => {
    const caps = getCoverCapabilities(makeCover({ supportedFeatures: 1 | 2 | 8 }));
    expect(caps.canOpen).toBe(true);
    expect(caps.canClose).toBe(true);
    expect(caps.canStop).toBe(true);
    expect(caps.canSetPosition).toBe(false);
  });

  it("falls back to open/close when features are missing", () => {
    const caps = getCoverCapabilities(makeCover({}));
    expect(caps.canOpen).toBe(true);
    expect(caps.canClose).toBe(true);
    expect(caps.canSetPosition).toBe(false);
  });

  it("falls back to open/close for undefined entity", () => {
    const caps = getCoverCapabilities(undefined);
    expect(caps.canOpen).toBe(true);
    expect(caps.canClose).toBe(true);
  });
});

describe("getCoverPosition", () => {
  it("returns numeric current_position", () => {
    expect(getCoverPosition(makeCover({ attributes: { current_position: 47 } }))).toBe(47);
  });

  it("returns null when position is not reported", () => {
    expect(getCoverPosition(makeCover({}))).toBeNull();
    expect(getCoverPosition(undefined)).toBeNull();
  });
});

describe("getCoverTiltPosition", () => {
  it("returns numeric current_tilt_position", () => {
    expect(getCoverTiltPosition(makeCover({ attributes: { current_tilt_position: 30 } }))).toBe(30);
  });

  it("returns null when tilt is not reported", () => {
    expect(getCoverTiltPosition(makeCover({}))).toBeNull();
  });
});

describe("isCoverOpen", () => {
  it("position-less garage door reporting state open is open", () => {
    const garage = makeCover({ state: "open", supportedFeatures: 1 | 2 | 8 });
    expect(isCoverOpen(garage)).toBe(true);
  });

  it("closed, unavailable, unknown are not open", () => {
    expect(isCoverOpen(makeCover({ state: "closed" }))).toBe(false);
    expect(isCoverOpen(makeCover({ state: "unavailable" }))).toBe(false);
    expect(isCoverOpen(makeCover({ state: "unknown" }))).toBe(false);
  });

  it("moving states count as open", () => {
    expect(isCoverOpen(makeCover({ state: "opening" }))).toBe(true);
  });
});

describe("isCoverFullyOpen / isCoverFullyClosed", () => {
  it("reads the position when the cover reports one", () => {
    const half = makeCover({ state: "open", attributes: { current_position: 40 } });
    expect(isCoverFullyOpen(half)).toBe(false);
    expect(isCoverFullyClosed(half)).toBe(false);
    expect(
      isCoverFullyOpen(makeCover({ state: "open", attributes: { current_position: 100 } })),
    ).toBe(true);
    expect(
      isCoverFullyClosed(makeCover({ state: "closed", attributes: { current_position: 0 } })),
    ).toBe(true);
  });

  it("falls back to the state for position-less covers", () => {
    expect(isCoverFullyOpen(makeCover({ state: "open" }))).toBe(true);
    expect(isCoverFullyClosed(makeCover({ state: "closed" }))).toBe(true);
    expect(isCoverFullyOpen(makeCover({ state: "opening" }))).toBe(false);
  });
});

describe("getCoverMovement", () => {
  it("names the movement of any moving member", () => {
    expect(
      getCoverMovement([makeCover({ state: "closed" }), makeCover({ state: "opening" })]),
    ).toBe("opening");
    expect(getCoverMovement([makeCover({ state: "closing" })])).toBe("closing");
    expect(getCoverMovement([makeCover({ state: "open" })])).toBeNull();
  });
});
