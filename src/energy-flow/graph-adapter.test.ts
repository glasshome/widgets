import { describe, expect, test } from "bun:test";
import type { EnergyFlow } from "./flow";
import { buildEnergyGraph, toDetailId } from "./graph-adapter";

const OFF = { configured: false, stale: false, watts: 0 } as const;

function flow(overrides: Partial<EnergyFlow>): EnergyFlow {
  return {
    solar: { ...OFF },
    grid: { ...OFF, direction: "idle" },
    battery: { ...OFF, direction: "idle" },
    home: { ...OFF },
    ev: { ...OFF },
    flowState: {},
    solarSleeping: false,
    ...overrides,
  };
}

const edgeOf = (g: ReturnType<typeof buildEnergyGraph>, id: string) =>
  g.graph.edges.find((e) => e.id === id);

describe("buildEnergyGraph topology", () => {
  test("solar + home (no EV): source -> hub; no redundant home spend node", () => {
    const g = buildEnergyGraph(
      flow({
        solar: { configured: true, stale: false, watts: 2000 },
        home: { configured: true, stale: false, watts: 1500 },
      }),
    );
    const ids = g.graph.nodes.map((n) => n.id).sort();
    // The hub IS the home; no separate "home" spend node without an EV split.
    expect(ids).toEqual(["hub", "solar"]);
    expect(edgeOf(g, "solar")?.from.node).toBe("solar");
    expect(edgeOf(g, "solar")?.to.node).toBe("hub");
    expect(edgeOf(g, "home")).toBeUndefined();
  });

  test("hub view carries total home consumption", () => {
    const g = buildEnergyGraph(flow({ home: { configured: true, stale: false, watts: 1500 } }));
    expect(g.views.get("hub")?.hub).toBe(true);
    expect(g.views.get("hub")?.value).toContain("1.5");
  });
});

describe("buildEnergyGraph direction + color", () => {
  test("grid export flows reverse and uses the export color/label", () => {
    const g = buildEnergyGraph(
      flow({
        grid: { configured: true, stale: false, watts: 1200, direction: "export" },
        home: { configured: true, stale: false, watts: 100 },
      }),
    );
    expect(edgeOf(g, "grid")?.direction).toBe("reverse");
    expect(g.views.get("grid")?.label).toBe("To grid");
    // export color differs from the import (grid-blue) / home color
    expect(edgeOf(g, "grid")?.color).not.toBe(g.views.get("hub")?.color);
  });

  test("battery charging flows reverse", () => {
    const g = buildEnergyGraph(
      flow({
        battery: { configured: true, stale: false, watts: 800, direction: "charge" },
        home: { configured: true, stale: false, watts: 100 },
      }),
    );
    expect(edgeOf(g, "battery")?.direction).toBe("reverse");
  });

  test("battery discharging flows forward", () => {
    const g = buildEnergyGraph(
      flow({
        battery: { configured: true, stale: false, watts: 800, direction: "discharge" },
        home: { configured: true, stale: false, watts: 900 },
      }),
    );
    expect(edgeOf(g, "battery")?.direction).toBe("forward");
  });
});

describe("buildEnergyGraph edge cases", () => {
  test("home-only config suppresses the redundant home spend node", () => {
    const g = buildEnergyGraph(flow({ home: { configured: true, stale: false, watts: 1500 } }));
    expect(g.graph.nodes.map((n) => n.id)).toEqual(["hub"]);
    expect(g.graph.edges).toHaveLength(0);
  });

  test("EV present: rest-of-home subtracts the EV load", () => {
    const g = buildEnergyGraph(
      flow({
        solar: { configured: true, stale: false, watts: 3000 },
        ev: { configured: true, stale: false, watts: 1000 },
        home: { configured: true, stale: false, watts: 1600 },
      }),
    );
    expect(g.views.get("home")?.label).toBe("Rest of home");
    expect(g.views.get("home")?.value).toContain("600");
    expect(edgeOf(g, "home")?.magnitude).toBe(600);
  });
});

describe("toDetailId", () => {
  test("hub maps to the home detail; sources map to themselves", () => {
    expect(toDetailId("hub")).toBe("home");
    expect(toDetailId("solar")).toBe("solar");
    expect(toDetailId("home")).toBe("home");
  });

  test("unknown ids return null", () => {
    expect(toDetailId("nope")).toBeNull();
  });
});
