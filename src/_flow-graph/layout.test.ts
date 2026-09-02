import { describe, expect, test } from "bun:test";
import { columnsLayout, DEFAULT_COLUMNS_OPTS as D } from "./layout";
import type { FlowEdge, FlowGraph, FlowNode } from "./types";

const node = (id: string, kind: FlowNode["kind"]): FlowNode => ({ id, kind });
const edge = (id: string, from: string, to: string, magnitude: number, idle = false): FlowEdge => ({
  id,
  from: { node: from },
  to: { node: to },
  magnitude,
  color: "#fff",
  direction: "forward",
  idle,
});

const basic: FlowGraph = {
  nodes: [node("solar", "source"), node("home", "hub"), node("load", "spend")],
  edges: [edge("e1", "solar", "home", 1000), edge("e2", "home", "load", 1000)],
};

describe("columnsLayout placement", () => {
  // 700px wide: the columns fit without the narrow-canvas clamp.
  const g = columnsLayout(basic, 700, 300);
  const rectOf = (id: string) => g.nodes.find((n) => n.node.id === id)?.rect;

  test("places source left, spend right, hub centered", () => {
    expect(rectOf("solar")?.x).toBe(D.padding);
    expect(rectOf("load")?.x).toBe(700 - D.padding - (rectOf("load")?.w ?? 0));
    expect(rectOf("home")?.x).toBe((700 - D.hubWidth) / 2);
  });

  test("columns take a share of a wide canvas instead of a fixed box", () => {
    const wide = columnsLayout(basic, 900, 300);
    const wideW = wide.nodes.find((n) => n.node.id === "solar")?.rect.w ?? 0;
    expect(rectOf("solar")?.w ?? 0).toBeGreaterThan(D.columnWidth);
    expect(wideW).toBeGreaterThan(rectOf("solar")?.w ?? 0);
  });

  test("resolves both edges to ribbons", () => {
    expect(g.edges).toHaveLength(2);
  });

  test("ribbons are constant width (same band height at both ends)", () => {
    for (const e of g.edges) {
      const fromH = e.from.bottom - e.from.top;
      const toH = e.to.bottom - e.to.top;
      expect(fromH).toBeCloseTo(toH);
      expect(fromH).toBeGreaterThan(0);
    }
  });

  test("both ribbons run left-to-right: source chip -> hub, hub -> spend chip", () => {
    const e1 = g.edges.find((e) => e.edge.id === "e1");
    const e2 = g.edges.find((e) => e.edge.id === "e2");
    // source chip sits left of the hub; spend chip sits right of the hub.
    expect(e1?.from.x ?? 0).toBeLessThan(e1?.to.x ?? 0);
    expect(e2?.from.x ?? 0).toBeLessThan(e2?.to.x ?? 0);
  });

  test("clamps column width so columns never overlap the hub on narrow canvases", () => {
    const narrow = columnsLayout(basic, 360, 300);
    const solar = narrow.nodes.find((n) => n.node.id === "solar")?.rect;
    const home = narrow.nodes.find((n) => n.node.id === "home")?.rect;
    const load = narrow.nodes.find((n) => n.node.id === "load")?.rect;
    // source right edge stays left of the hub; hub right edge stays left of spend.
    expect((solar?.x ?? 0) + (solar?.w ?? 0)).toBeLessThan(home?.x ?? 0);
    expect((home?.x ?? 0) + (home?.w ?? 0)).toBeLessThan(load?.x ?? 0);
  });
});

describe("columnsLayout stacking", () => {
  test("multiple source lanes stack without crossing", () => {
    const g: FlowGraph = {
      nodes: [node("a", "source"), node("b", "source"), node("c", "source"), node("hub", "hub")],
      edges: [
        edge("ea", "a", "hub", 300),
        edge("eb", "b", "hub", 300),
        edge("ec", "c", "hub", 300),
      ],
    };
    const out = columnsLayout(g, 400, 360);
    const hubTops = ["ea", "eb", "ec"].map(
      (id) => out.edges.find((e) => e.edge.id === id)?.to.top ?? 0,
    );
    expect(hubTops[0]).toBeLessThan(hubTops[1]);
    expect(hubTops[1]).toBeLessThan(hubTops[2]);
  });

  test("a zero-magnitude edge is a thin ribbon, not a special-cased centerline", () => {
    const g: FlowGraph = {
      nodes: [node("a", "source"), node("hub", "hub")],
      edges: [edge("ea", "a", "hub", 0, true)],
    };
    const out = columnsLayout(g, 400, 300);
    const e = out.edges.find((x) => x.edge.id === "ea");
    const fromH = (e?.from.bottom ?? 0) - (e?.from.top ?? 0);
    const toH = (e?.to.bottom ?? 0) - (e?.to.top ?? 0);
    // Floored to minRibbon at both ends; same uniform geometry as any ribbon.
    expect(fromH).toBeCloseTo(D.minRibbon);
    expect(toH).toBeCloseTo(D.minRibbon);
  });
});

describe("columnsLayout determinism", () => {
  test("same input yields identical output", () => {
    expect(columnsLayout(basic, 400, 300)).toEqual(columnsLayout(basic, 400, 300));
  });
});
