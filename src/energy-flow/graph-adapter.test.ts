import { describe, expect, test } from "bun:test";
import { energyColors } from "../_energy-shared/colors";
import {
  buildEnergyGraph,
  configEntityIds,
  dominantColor,
  type PowerLookup,
  resolveFlow,
} from "./graph-adapter";
import type { BidirectionalNodeConfig, FlowNodeConfig } from "./node-model";

function input(entities: string[], label = "Solar"): FlowNodeConfig {
  return { kind: "input", entities, label, icon: "mdi:solar-power-variant", level: [] };
}

function output(
  entities: string[],
  overrides: Partial<{ remainder: boolean; label: string; level: string[] }> = {},
): FlowNodeConfig {
  return {
    kind: "output",
    entities,
    remainder: overrides.remainder ?? false,
    label: overrides.label ?? "Home",
    icon: "mdi:home-lightning-bolt",
    level: overrides.level ?? [],
  };
}

function bidirectional(overrides: Partial<BidirectionalNodeConfig> = {}): FlowNodeConfig {
  return {
    kind: "bidirectional",
    positive: [],
    negative: [],
    signed: [],
    signedOutbound: false,
    priced: false,
    label: "Grid",
    icon: "mdi:transmission-tower",
    level: [],
    ...overrides,
  };
}

function lookupFrom(values: Record<string, number | null>): PowerLookup {
  return (id) => (id in values ? (values[id] ?? null) : null);
}

describe("resolveFlow", () => {
  test("empty node list resolves to an unconfigured flow", () => {
    const flow = resolveFlow([], () => null, false);
    expect(flow.nodes).toEqual([]);
    expect(flow.hubW).toBe(0);
  });

  test("input entities sum into one node", () => {
    const flow = resolveFlow(
      [input(["sensor.roof", "sensor.garage"]), output([], { remainder: true })],
      lookupFrom({ "sensor.roof": 1500, "sensor.garage": 800 }),
      false,
    );
    expect(flow.nodes[0]).toMatchObject({ watts: 2300, direction: "in", configured: true });
  });

  test("one unavailable member marks the node stale but sums the rest", () => {
    const flow = resolveFlow(
      [input(["sensor.roof", "sensor.garage"])],
      lookupFrom({ "sensor.roof": 1500, "sensor.garage": null }),
      false,
    );
    expect(flow.nodes[0]).toMatchObject({ watts: 1500, stale: true });
  });

  test("dual sensors split a two-way node by side", () => {
    const flow = resolveFlow(
      [bidirectional({ positive: ["sensor.imp"], negative: ["sensor.exp"] })],
      lookupFrom({ "sensor.imp": 1200, "sensor.exp": 0 }),
      false,
    );
    expect(flow.nodes[0]).toMatchObject({ watts: 1200, direction: "in" });
  });

  test("signed sensor maps negative to outgoing", () => {
    const flow = resolveFlow(
      [bidirectional({ signed: ["sensor.grid"] })],
      lookupFrom({ "sensor.grid": -800 }),
      false,
    );
    expect(flow.nodes[0]).toMatchObject({ watts: 800, direction: "out" });
  });

  test("signedOutbound flips the convention (old battery signed)", () => {
    const flow = resolveFlow(
      [bidirectional({ signed: ["sensor.bat"], signedOutbound: true })],
      lookupFrom({ "sensor.bat": 500 }),
      false,
    );
    // Old battery: positive = charging = away from the home.
    expect(flow.nodes[0]).toMatchObject({ watts: 500, direction: "out" });
  });

  test("remainder output soaks up inputs minus measured outputs", () => {
    const flow = resolveFlow(
      [
        input(["sensor.solar"]),
        bidirectional({ signed: ["sensor.grid"], priced: true }),
        output([], { remainder: true }),
      ],
      lookupFrom({ "sensor.solar": 2000, "sensor.grid": 500 }),
      false,
    );
    // grid import 500 + solar 2000 = 2500 home (old grid_plus_solar math).
    expect(flow.nodes[2]).toMatchObject({ watts: 2500, direction: "out", configured: true });
    expect(flow.hubW).toBe(2500);
  });

  test("remainder subtracts measured outputs and outgoing two-way flow", () => {
    const flow = resolveFlow(
      [
        input(["sensor.solar"]),
        bidirectional({ negative: ["sensor.chg"] }),
        output(["sensor.ev"], { label: "EV" }),
        output([], { remainder: true }),
      ],
      lookupFrom({ "sensor.solar": 3000, "sensor.chg": 400, "sensor.ev": 1000 }),
      false,
    );
    expect(flow.nodes[3]?.watts).toBe(1600);
    // Hub carries outputs only (EV + remainder), not the charging flow.
    expect(flow.hubW).toBe(2600);
  });

  test("remainder is unconfigured while nothing feeds it", () => {
    const flow = resolveFlow([output([], { remainder: true })], () => null, false);
    expect(flow.nodes[0]?.configured).toBe(false);
  });

  test("level entity is surfaced when available", () => {
    const flow = resolveFlow(
      [bidirectional({ signed: ["sensor.bat"], level: ["sensor.soc"] })],
      lookupFrom({ "sensor.bat": -300, "sensor.soc": 72 }),
      false,
    );
    expect(flow.nodes[0]?.level).toBe(72);
  });

  test("inputs rest after sunset when producing nothing", () => {
    const rested = resolveFlow([input(["sensor.solar"])], lookupFrom({ "sensor.solar": 10 }), true);
    expect(rested.nodes[0]?.resting).toBe(true);
    expect(rested.flowState.solarSleeping).toBe(true);
    const producing = resolveFlow(
      [input(["sensor.solar"])],
      lookupFrom({ "sensor.solar": 200 }),
      true,
    );
    expect(producing.nodes[0]?.resting).toBe(false);
  });

  test("configEntityIds collects sensors from every node shape", () => {
    const ids = configEntityIds([
      input(["sensor.solar"]),
      bidirectional({ positive: ["sensor.imp"], negative: ["sensor.exp"], level: ["sensor.soc"] }),
      output(["sensor.ev"], { level: ["sensor.ev_soc"] }),
    ]);
    expect(ids.sort()).toEqual([
      "sensor.ev",
      "sensor.ev_soc",
      "sensor.exp",
      "sensor.imp",
      "sensor.soc",
      "sensor.solar",
    ]);
  });
});

const edgeOf = (g: ReturnType<typeof buildEnergyGraph>, id: string) =>
  g.graph.edges.find((e) => e.id === id);

describe("buildEnergyGraph topology", () => {
  test("inputs feed the hub; outputs draw from it", () => {
    const flow = resolveFlow(
      [input(["sensor.solar"]), output(["sensor.home"])],
      lookupFrom({ "sensor.solar": 2000, "sensor.home": 1500 }),
      false,
    );
    const g = buildEnergyGraph(flow);
    expect(g.graph.nodes.map((n) => n.id).sort()).toEqual(["hub", "node-0", "node-1"]);
    expect(edgeOf(g, "node-0")?.from.node).toBe("node-0");
    expect(edgeOf(g, "node-0")?.to.node).toBe("hub");
    expect(edgeOf(g, "node-1")?.from.node).toBe("hub");
    expect(edgeOf(g, "node-1")?.to.node).toBe("node-1");
  });

  test("hub view carries total consumption", () => {
    const flow = resolveFlow([output(["sensor.home"])], lookupFrom({ "sensor.home": 1500 }), false);
    const g = buildEnergyGraph(flow);
    expect(g.views.get("hub")?.hub).toBe(true);
    expect(g.views.get("hub")?.value).toContain("1.5");
  });

  test("unconfigured nodes are dropped from the graph", () => {
    const flow = resolveFlow(
      [input([]), output(["sensor.home"])],
      lookupFrom({ "sensor.home": 900 }),
      false,
    );
    const g = buildEnergyGraph(flow);
    expect(g.graph.nodes.map((n) => n.id).sort()).toEqual(["hub", "node-1"]);
  });

  test("node view shows the level suffix on the label", () => {
    const flow = resolveFlow(
      [bidirectional({ signed: ["sensor.bat"], label: "Battery", level: ["sensor.soc"] })],
      lookupFrom({ "sensor.bat": -300, "sensor.soc": 72 }),
      false,
    );
    expect(buildEnergyGraph(flow).views.get("node-0")?.label).toBe("Battery · 72%");
  });
});

describe("buildEnergyGraph direction + color", () => {
  test("a priced two-way node pushing out flows reverse in export color", () => {
    const flow = resolveFlow(
      [bidirectional({ signed: ["sensor.grid"], priced: true }), output([], { remainder: true })],
      lookupFrom({ "sensor.grid": -1200 }),
      false,
    );
    const g = buildEnergyGraph(flow);
    expect(edgeOf(g, "node-0")?.direction).toBe("reverse");
    expect(g.views.get("node-0")?.color).toBe(energyColors.export);
  });

  test("an unpriced two-way node charging flows reverse, discharging forward", () => {
    const charging = resolveFlow(
      [bidirectional({ signed: ["sensor.bat"], signedOutbound: true })],
      lookupFrom({ "sensor.bat": 800 }),
      false,
    );
    expect(edgeOf(buildEnergyGraph(charging), "node-0")?.direction).toBe("reverse");
    const discharging = resolveFlow(
      [bidirectional({ signed: ["sensor.bat"], signedOutbound: true })],
      lookupFrom({ "sensor.bat": -800 }),
      false,
    );
    expect(edgeOf(buildEnergyGraph(discharging), "node-0")?.direction).toBe("forward");
  });

  test("resting input reads Back at sunrise", () => {
    const flow = resolveFlow([input(["sensor.solar"])], lookupFrom({ "sensor.solar": 0 }), true);
    expect(buildEnergyGraph(flow).views.get("node-0")?.value).toBe("Back at sunrise");
  });

  test("dominantColor picks the strongest supplier, falls back to home", () => {
    const flow = resolveFlow(
      [
        input(["sensor.solar"]),
        bidirectional({ signed: ["sensor.grid"], priced: true }),
        output([], { remainder: true }),
      ],
      lookupFrom({ "sensor.solar": 500, "sensor.grid": 2000 }),
      false,
    );
    expect(dominantColor(flow)).toBe(energyColors.grid);
    const quiet = resolveFlow([input(["sensor.solar"])], lookupFrom({ "sensor.solar": 10 }), false);
    expect(dominantColor(quiet)).toBe(energyColors.home);
  });
});

describe("buildEnergyGraph tariff sub-lines", () => {
  const tariff = { currency: "€", rate: 0.3 };
  const gridAndHome = (): FlowNodeConfig[] => [
    bidirectional({ signed: ["sensor.grid"], priced: true }),
    output([], { remainder: true }),
  ];

  test("no tariff -> no chip sub-lines", () => {
    const flow = resolveFlow(gridAndHome(), lookupFrom({ "sensor.grid": 2000 }), false);
    expect(buildEnergyGraph(flow).views.get("node-0")?.sub).toBeUndefined();
  });

  test("priced import shows a bare cost rate", () => {
    const flow = resolveFlow(gridAndHome(), lookupFrom({ "sensor.grid": 2000 }), false);
    // 2 kW * €0.30 = €0.60/h
    expect(buildEnergyGraph(flow, tariff).views.get("node-0")?.sub).toBe("€0.60/h");
  });

  test("priced export is framed as earnings", () => {
    const flow = resolveFlow(gridAndHome(), lookupFrom({ "sensor.grid": -1500 }), false);
    expect(buildEnergyGraph(flow, tariff).views.get("node-0")?.sub).toBe("Earns €0.45/h");
  });

  test("sole input self-consumption is framed as savings", () => {
    const flow = resolveFlow(
      [input(["sensor.solar"]), output([], { remainder: true })],
      lookupFrom({ "sensor.solar": 3000 }),
      false,
    );
    // 3 kW self-consumed * €0.30 = €0.90/h
    expect(buildEnergyGraph(flow, tariff).views.get("node-0")?.sub).toBe("Saves €0.90/h");
  });

  test("with two inputs the aggregate savings line is omitted", () => {
    const flow = resolveFlow(
      [input(["sensor.roof"]), input(["sensor.garage"], "Garage"), output([], { remainder: true })],
      lookupFrom({ "sensor.roof": 2000, "sensor.garage": 1000 }),
      false,
    );
    const g = buildEnergyGraph(flow, tariff);
    expect(g.views.get("node-0")?.sub).toBeUndefined();
    expect(g.views.get("node-1")?.sub).toBeUndefined();
  });
});
