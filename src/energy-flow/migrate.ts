// configVersion 1/2 to 3: maps the old fixed five-role fields onto the node list.

import { type FlowNodeConfig, type NodeRole, roleOf } from "./node-model";

// Runs on user-stored JSON, so strays are tolerated.
function ids(value: unknown): string[] {
  if (typeof value === "string") return value.length > 0 ? [value] : [];
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string" && x.length > 0);
}

export function migrateConfig(
  config: Record<string, unknown>,
  _fromConfigVersion: number,
): Record<string, unknown> {
  if (Array.isArray(config.nodes)) return config;

  const nodes: FlowNodeConfig[] = [];

  const solar = ids(config.solarEntity);
  if (solar.length > 0) {
    nodes.push({
      kind: "input",
      entities: solar,
      // ui-text-ok: a stored label the homeowner can rename
      label: "Solar",
      icon: "mdi:solar-power-variant",
      level: [],
    });
  }

  const batteryIn = ids(config.batteryDischargeEntity);
  const batteryOut = ids(config.batteryChargeEntity);
  const batterySigned = ids(config.batterySignedEntity);
  const hasBattery = batteryIn.length + batteryOut.length + batterySigned.length > 0;
  if (hasBattery) {
    nodes.push({
      kind: "bidirectional",
      positive: batteryIn,
      negative: batteryOut,
      signed: batterySigned,
      // Old battery signed convention: positive = charging = away from home.
      signedOutbound: batterySigned.length > 0,
      priced: false,
      // ui-text-ok: a stored label the homeowner can rename
      label: "Battery",
      icon: "mdi:battery-high",
      level: ids(config.batterySocEntity),
    });
  }

  const gridIn = ids(config.gridImportEntity);
  const gridOut = ids(config.gridExportEntity);
  const gridSigned = ids(config.gridSignedEntity);
  const hasGrid = gridIn.length + gridOut.length + gridSigned.length > 0;
  if (hasGrid) {
    nodes.push({
      kind: "bidirectional",
      positive: gridIn,
      negative: gridOut,
      signed: gridSigned,
      signedOutbound: false,
      priced: true,
      // ui-text-ok: a stored label the homeowner can rename
      label: "Grid",
      icon: "mdi:transmission-tower",
      level: [],
    });
  }

  // Home, by strategy. An "entity"/"sum_consumers" strategy without its
  // backing sensors behaves like the old unset state; fall back to the
  // schema-default derived home (remainder) so migrated configs stay valid.
  const homeEntities =
    config.homeStrategy === "entity"
      ? ids(config.homeEntity)
      : config.homeStrategy === "sum_consumers"
        ? ids(config.consumerEntities)
        : [];
  if (homeEntities.length > 0) {
    nodes.push({
      kind: "output",
      entities: homeEntities,
      remainder: false,
      // ui-text-ok: a stored label the homeowner can rename
      label: "Home",
      icon: "mdi:home-lightning-bolt",
      level: [],
    });
  } else if (solar.length > 0 || hasGrid) {
    // Mirrors the old grid_plus_solar "configured" rule (solar or grid).
    nodes.push({
      kind: "output",
      entities: [],
      remainder: true,
      // ui-text-ok: a stored label the homeowner can rename
      label: "Home",
      icon: "mdi:home-lightning-bolt",
      level: [],
    });
  }

  const ev = ids(config.evEntity);
  if (ev.length > 0) {
    nodes.push({
      kind: "output",
      entities: ev,
      remainder: false,
      // ui-text-ok: a stored label the homeowner can rename
      label: "EV charging",
      icon: "mdi:car-electric",
      level: ids(config.evSocEntity),
    });
  }

  return {
    title: config.title,
    nodes,
    sunEntity: ids(config.sunEntity),
    tariffCurrency: config.tariffCurrency,
    tariffRate: config.tariffRate,
  };
}

const OLD_ENGLISH: Record<NodeRole, string> = {
  // ui-text-ok: a name the old migration stored, matched and cleared
  solar: "Solar",
  // ui-text-ok: a name the old migration stored, matched and cleared
  battery: "Battery",
  // ui-text-ok: a name the old migration stored, matched and cleared
  grid: "Grid",
  // ui-text-ok: a name the old migration stored, matched and cleared
  home: "Home",
  // ui-text-ok: a name the old migration stored, matched and cleared
  ev: "EV charging",
};

const isNode = (value: unknown): value is FlowNodeConfig =>
  typeof value === "object" && value !== null;

export function migrateEnergyFlow(
  config: Record<string, unknown>,
  fromConfigVersion: number,
): Record<string, unknown> {
  const migrated = migrateConfig(config, fromConfigVersion);
  if (fromConfigVersion >= 4 || !Array.isArray(migrated.nodes)) return migrated;
  const nodes = migrated.nodes.map((node: unknown) => {
    if (!isNode(node)) return node;
    const role = roleOf(node);
    return role !== undefined && node.label === OLD_ENGLISH[role] ? { ...node, label: "" } : node;
  });
  return { ...migrated, nodes };
}
