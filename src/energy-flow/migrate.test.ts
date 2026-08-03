import { describe, expect, test } from "bun:test";
import { migrateConfig } from "./migrate";
import { type FlowNodeConfig, validateNodes } from "./node-model";

/** A full v2 config as the host stored it (every key present, defaults filled). */
function v2(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: "Energy",
    solarEntity: [],
    gridImportEntity: [],
    gridExportEntity: [],
    gridSignedEntity: [],
    batteryChargeEntity: [],
    batteryDischargeEntity: [],
    batterySignedEntity: [],
    batterySocEntity: [],
    homeStrategy: "grid_plus_solar",
    homeEntity: [],
    consumerEntities: [],
    evEntity: [],
    evSocEntity: [],
    sunEntity: ["sun.sun"],
    tariffCurrency: "€",
    tariffRate: 0.3,
    configVersion: 2,
    ...overrides,
  };
}

function nodesOf(config: Record<string, unknown>): FlowNodeConfig[] {
  return migrateConfig(config, 2).nodes as FlowNodeConfig[];
}

describe("migrateConfig field mapping", () => {
  test("solar entities become one summed input node", () => {
    const nodes = nodesOf(v2({ solarEntity: ["sensor.roof", "sensor.garage"] }));
    expect(nodes[0]).toEqual({
      kind: "input",
      entities: ["sensor.roof", "sensor.garage"],
      label: "Solar",
      icon: "mdi:solar-power-variant",
      level: [],
    });
  });

  test("dual grid sensors become one priced bidirectional node", () => {
    const nodes = nodesOf(
      v2({ gridImportEntity: ["sensor.imp"], gridExportEntity: ["sensor.exp"] }),
    );
    expect(nodes[0]).toEqual({
      kind: "bidirectional",
      positive: ["sensor.imp"],
      negative: ["sensor.exp"],
      signed: [],
      signedOutbound: false,
      priced: true,
      label: "Grid",
      icon: "mdi:transmission-tower",
      level: [],
    });
  });

  test("signed grid keeps the into-the-home convention (no flip)", () => {
    const nodes = nodesOf(v2({ gridSignedEntity: ["sensor.grid"] }));
    expect(nodes[0]).toMatchObject({
      kind: "bidirectional",
      signed: ["sensor.grid"],
      signedOutbound: false,
      priced: true,
    });
  });

  test("battery sensors + SOC become one unpriced bidirectional with a level", () => {
    const nodes = nodesOf(
      v2({
        batteryChargeEntity: ["sensor.chg"],
        batteryDischargeEntity: ["sensor.dis"],
        batterySocEntity: ["sensor.soc"],
      }),
    );
    expect(nodes[0]).toEqual({
      kind: "bidirectional",
      positive: ["sensor.dis"],
      negative: ["sensor.chg"],
      signed: [],
      signedOutbound: false,
      priced: false,
      label: "Battery",
      icon: "mdi:battery-high",
      level: ["sensor.soc"],
    });
  });

  test("signed battery flips the sign convention (old positive = charging)", () => {
    const nodes = nodesOf(v2({ batterySignedEntity: ["sensor.bat"] }));
    expect(nodes[0]).toMatchObject({
      kind: "bidirectional",
      signed: ["sensor.bat"],
      signedOutbound: true,
      priced: false,
    });
  });

  test("EV + SOC become a measured output with a level", () => {
    const nodes = nodesOf(v2({ evEntity: ["sensor.ev"], evSocEntity: ["sensor.ev_soc"] }));
    expect(nodes).toEqual([
      {
        kind: "output",
        entities: ["sensor.ev"],
        remainder: false,
        label: "EV charging",
        icon: "mdi:car-electric",
        level: ["sensor.ev_soc"],
      },
    ]);
  });

  test("homeStrategy entity becomes a measured home output", () => {
    const nodes = nodesOf(
      v2({ homeStrategy: "entity", homeEntity: ["sensor.home"], solarEntity: ["sensor.solar"] }),
    );
    expect(nodes[1]).toEqual({
      kind: "output",
      entities: ["sensor.home"],
      remainder: false,
      label: "Home",
      icon: "mdi:home-lightning-bolt",
      level: [],
    });
  });

  test("homeStrategy grid_plus_solar becomes the remainder output", () => {
    const nodes = nodesOf(v2({ solarEntity: ["sensor.solar"] }));
    expect(nodes[1]).toEqual({
      kind: "output",
      entities: [],
      remainder: true,
      label: "Home",
      icon: "mdi:home-lightning-bolt",
      level: [],
    });
  });

  test("homeStrategy sum_consumers becomes one output summing the consumers", () => {
    const nodes = nodesOf(
      v2({
        homeStrategy: "sum_consumers",
        consumerEntities: ["sensor.a", "sensor.b"],
        gridSignedEntity: ["sensor.grid"],
      }),
    );
    expect(nodes[1]).toMatchObject({
      kind: "output",
      entities: ["sensor.a", "sensor.b"],
      remainder: false,
    });
  });

  test("entity strategy without a home sensor falls back to the remainder", () => {
    const nodes = nodesOf(v2({ homeStrategy: "entity", solarEntity: ["sensor.solar"] }));
    expect(nodes[1]).toMatchObject({ kind: "output", remainder: true });
  });

  test("no remainder is emitted without solar or grid (old configured rule)", () => {
    const nodes = nodesOf(v2({ batterySignedEntity: ["sensor.bat"] }));
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.kind).toBe("bidirectional");
  });
});

describe("migrateConfig shape", () => {
  test("full config keeps node order solar, battery, grid, home, EV", () => {
    const migrated = migrateConfig(
      v2({
        solarEntity: ["sensor.solar"],
        gridImportEntity: ["sensor.imp"],
        gridExportEntity: ["sensor.exp"],
        batteryChargeEntity: ["sensor.chg"],
        batteryDischargeEntity: ["sensor.dis"],
        batterySocEntity: ["sensor.soc"],
        homeStrategy: "entity",
        homeEntity: ["sensor.home"],
        evEntity: ["sensor.ev"],
      }),
      2,
    );
    const nodes = migrated.nodes as FlowNodeConfig[];
    expect(nodes.map((n) => n.label)).toEqual(["Solar", "Battery", "Grid", "Home", "EV charging"]);
    expect(migrated.title).toBe("Energy");
    expect(migrated.sunEntity).toEqual(["sun.sun"]);
    expect(migrated.tariffCurrency).toBe("€");
    expect(migrated.tariffRate).toBe(0.3);
    expect("solarEntity" in migrated).toBe(false);
  });

  test("empty old config migrates to an empty node list", () => {
    expect(nodesOf(v2())).toEqual([]);
  });

  test("v1 stray string values are tolerated", () => {
    const nodes = nodesOf(v2({ solarEntity: "sensor.solar", gridSignedEntity: ["sensor.grid"] }));
    expect(nodes[0]).toMatchObject({ kind: "input", entities: ["sensor.solar"] });
  });

  test("already node-shaped configs pass through untouched", () => {
    const config = { nodes: [{ kind: "input", entities: [] }] };
    expect(migrateConfig(config, 2)).toBe(config);
  });

  test("every migrated shape passes cross-item validation", () => {
    const shapes = [
      v2(),
      v2({ solarEntity: ["sensor.solar"] }),
      v2({ homeStrategy: "entity", homeEntity: ["sensor.home"] }),
      v2({ evEntity: ["sensor.ev"] }),
      v2({ batterySignedEntity: ["sensor.bat"] }),
      v2({ gridSignedEntity: ["sensor.grid"] }),
      v2({ homeStrategy: "entity", solarEntity: ["sensor.solar"] }),
      v2({ homeStrategy: "sum_consumers", solarEntity: ["sensor.solar"] }),
      v2({
        solarEntity: ["sensor.solar"],
        gridImportEntity: ["sensor.imp"],
        batteryChargeEntity: ["sensor.chg"],
        homeStrategy: "entity",
        homeEntity: ["sensor.home"],
        evEntity: ["sensor.ev"],
      }),
    ];
    for (const shape of shapes) {
      expect(validateNodes(nodesOf(shape))).toEqual([]);
    }
  });
});
