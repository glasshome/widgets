import { describe, expect, test } from "bun:test";
import { languageTools } from "@glasshome/widget-sdk/testing/tools";
import { catalogsOf, language } from "../../tests/catalog";
import { resolveFlow } from "./graph-adapter";
import { migrateEnergyFlow } from "./migrate";
import type { FlowNodeConfig } from "./node-model";

const word = (tag: string, key: string): string => {
  const parts = catalogsOf("energy-flow")[tag]?.[key];
  if (parts?.length !== 1 || typeof parts[0] !== "string") throw new Error(`${tag} ${key}`);
  return parts[0];
};

const stored = (label: string): Record<string, unknown>[] => [
  { kind: "input", entities: ["sensor.s"], label, icon: "mdi:solar-power-variant", level: [] },
  {
    kind: "bidirectional",
    positive: ["sensor.b"],
    negative: [],
    signed: [],
    signedOutbound: false,
    priced: false,
    label: label && "Battery",
    icon: "mdi:battery-high",
    level: [],
  },
  {
    kind: "bidirectional",
    positive: ["sensor.g"],
    negative: [],
    signed: [],
    signedOutbound: false,
    priced: true,
    label: label && "Grid",
    icon: "mdi:transmission-tower",
    level: [],
  },
  {
    kind: "output",
    entities: [],
    remainder: true,
    label: label && "Home",
    icon: "mdi:home-lightning-bolt",
    level: [],
  },
  {
    kind: "output",
    entities: ["sensor.e"],
    remainder: false,
    label: label && "EV charging",
    icon: "mdi:car-electric",
    level: [],
  },
];

const labelsAfterMigration = (tag: "en" | "de", nodes: unknown[]) => {
  const migrated = migrateEnergyFlow({ nodes }, 3).nodes as FlowNodeConfig[];
  const flow = resolveFlow(
    migrated.filter((n) => typeof n === "object" && n !== null),
    () => 0,
    false,
    languageTools(language("energy-flow", tag)),
  );
  return flow.nodes.map((n) => n.label);
};

describe("a migrated default node reads its role word", () => {
  test("in English the stored defaults read as before", () => {
    const solar = stored("Solar");
    expect(labelsAfterMigration("en", solar)).toEqual([
      "Solar",
      "Battery",
      "Grid",
      "Home",
      "EV charging",
    ]);
  });

  test("in German they read the catalog's role words", () => {
    expect(labelsAfterMigration("de", stored("Solar"))).toEqual(
      ["solar", "battery", "grid", "home", "ev"].map((role) =>
        word("de", `energy-flow.node.${role}`),
      ),
    );
  });

  test("a label the home chose stays in both languages", () => {
    const nodes = stored("Solar").map((n, i) => (i === 0 ? { ...n, label: "Roof" } : n));
    expect(labelsAfterMigration("de", nodes)[0]).toBe("Roof");
    expect(labelsAfterMigration("en", nodes)[0]).toBe("Roof");
  });

  test("a stray null node does not throw", () => {
    expect(() => migrateEnergyFlow({ nodes: [null, "x", ...stored("Solar")] }, 3)).not.toThrow();
  });

  test("a node outside the roles keeps the kind word", () => {
    const odd = [{ kind: "input", entities: ["sensor.s"], label: "", icon: "", level: [] }];
    expect(labelsAfterMigration("en", odd)).toEqual(["Input"]);
  });
});
