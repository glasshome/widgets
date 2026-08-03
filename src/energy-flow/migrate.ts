/**
 * configVersion 1/2 → 3 transform: maps the old fixed five-role flat fields
 * onto the node list mechanically (dynamic-flow-nodes memo, Migration section).
 * Runs in the host's `resolveConfig` before the zod parse, so the output only
 * needs the discriminators and values — the schema fills variant defaults.
 * Pure and SDK-free so it unit-tests server-side.
 */

import type { FlowNodeConfig } from "./node-model";

/** Old fields stored entity IDs as string arrays; v1 single-selects were
 *  already arrays too. Be lenient about strays anyway — this runs on
 *  user-stored JSON. */
function ids(value: unknown): string[] {
  if (typeof value === "string") return value.length > 0 ? [value] : [];
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string" && x.length > 0);
}

export function migrateConfig(
  config: Record<string, unknown>,
  _fromConfigVersion: number,
): Record<string, unknown> {
  // Already node-shaped (defensive: resolveConfig only calls when behind).
  if (Array.isArray(config.nodes)) return config;

  const nodes: FlowNodeConfig[] = [];

  const solar = ids(config.solarEntity);
  if (solar.length > 0) {
    nodes.push({
      kind: "input",
      entities: solar,
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
