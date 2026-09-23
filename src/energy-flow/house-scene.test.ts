import { describe, expect, it } from "bun:test";
import { flowWidth, layoutHouseScene, ribbonShape, type SceneNode } from "./house-scene";

const node = (id: string, role: SceneNode["role"]): SceneNode => ({ id, role });
const box = { width: 480, height: 240 };

describe("layoutHouseScene", () => {
  const scene = layoutHouseScene(
    [
      node("solar", "roof"),
      node("grid", "base"),
      node("battery", "base"),
      node("ev", "wall-right"),
    ],
    box,
  );

  it("centres the house inside the scene, above the two-way row", () => {
    const { house } = scene;
    expect(house.x + house.w / 2).toBeCloseTo(240, 0);
    expect(house.y).toBeGreaterThanOrEqual(0);
    const bottomRow = scene.labels.filter((l) => l.side === "bottom");
    for (const l of bottomRow) expect(l.at.y).toBeGreaterThan(house.y + house.h);
  });

  it("wires every node to a point on the house itself", () => {
    const { house } = scene;
    for (const link of scene.links) {
      expect(link.anchor.x).toBeGreaterThanOrEqual(house.x);
      expect(link.anchor.x).toBeLessThanOrEqual(house.x + house.w);
      expect(link.anchor.y).toBeGreaterThanOrEqual(house.y);
      expect(link.anchor.y).toBeLessThanOrEqual(house.y + house.h);
    }
  });

  it("starts each column line right at the house's side, at any width", () => {
    for (const width of [340, 420, 520, 640]) {
      const s = layoutHouseScene([node("solar", "roof"), node("ev", "wall-right")], {
        width,
        height: 240,
      });
      const [solar, ev] = s.links;
      expect((solar?.anchor.x ?? 0) - (solar?.from.x ?? 0)).toBeLessThan(s.house.w * 0.5);
      expect((ev?.from.x ?? 0) - (ev?.anchor.x ?? 0)).toBeLessThan(s.house.w * 0.1 + 20);
    }
  });

  it("places sources left, loads right, two-way nodes under the house", () => {
    const side = new Map(scene.labels.map((l) => [l.id, l.side]));
    expect(side.get("solar")).toBe("left");
    expect(side.get("ev")).toBe("right");
    expect(side.get("grid")).toBe("bottom");
    expect(side.get("battery")).toBe("bottom");
  });

  it("spreads nodes that share a spot", () => {
    const [grid, battery] = scene.links.filter((l) => l.side === "bottom");
    expect(grid?.anchor.x).not.toBe(battery?.anchor.x);
  });
});

describe("the two-way row", () => {
  it("spreads its labels far enough apart to never overlap", () => {
    const s = layoutHouseScene([node("grid", "base"), node("battery", "base")], {
      width: 340,
      height: 240,
    });
    const [a, b] = s.labels;
    expect(Math.abs((a?.at.x ?? 0) - (b?.at.x ?? 0))).toBeGreaterThanOrEqual(100);
  });
});

describe("a column on a small house", () => {
  it("keeps its labels at least a row apart", () => {
    const s = layoutHouseScene([node("home", "wall-right"), node("ev", "wall-right")], {
      width: 340,
      height: 120,
    });
    const [a, b] = s.labels;
    expect(Math.abs((a?.at.y ?? 0) - (b?.at.y ?? 0))).toBeGreaterThanOrEqual(36);
  });
});

describe("flow ribbons", () => {
  it("grow with power, relative to the largest flow, and never vanish", () => {
    expect(flowWidth(4000, 4000)).toBeCloseTo(12, 5);
    expect(flowWidth(1000, 4000)).toBeGreaterThan(flowWidth(250, 4000));
    expect(flowWidth(1, 4000)).toBeGreaterThan(2.5);
  });

  it("draw a closed shape between the label and the house", () => {
    const d = ribbonShape({ side: "left", from: { x: 0, y: 0 }, anchor: { x: 100, y: 40 } }, 2, 10);
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
  });
});
