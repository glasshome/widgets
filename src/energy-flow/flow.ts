/**
 * The resolved flow model: what each configured node is doing right now, plus
 * the aggregates the rest of the widget renders from. Config-free — nodes are
 * resolved from config by `graph-adapter.ts` (the only module that knows the
 * config field names); everything here operates on `ResolvedNode`s. Pure — no
 * SolidJS, no DOM.
 */

import type { FlowState } from "../_energy-shared/formatting";

/** Flows at or below this read as idle everywhere in the widget (W). */
export const ACTIVE_THRESHOLD = 50;

export type NodeKind = "input" | "output" | "bidirectional";

/** Which side of the hub the node's power is flowing right now. */
export type FlowDirection = "in" | "out" | "idle";

export interface ResolvedNode {
  id: string;
  kind: NodeKind;
  label: string;
  icon: string;
  color: string;
  /** At least one backing entity selected (remainder: any in-capable node is). */
  configured: boolean;
  /** Any backing entity is unavailable. */
  stale: boolean;
  /** Magnitude of the current flow (W). */
  watts: number;
  direction: FlowDirection;
  remainder: boolean;
  /** Tariff prices this node's import/export (bidirectional only). */
  priced: boolean;
  /** Level (%) when a level entity is configured and available. */
  level?: number;
  /** Input resting after sunset (sun below horizon, nothing produced). */
  resting: boolean;
}

export interface ResolvedFlow {
  nodes: ResolvedNode[];
  /** Total consumption: sum of output nodes, measured and remainder (W). */
  hubW: number;
  /** Legacy role aggregate feeding `describeFlow` and `computeCost`. */
  flowState: FlowState;
}

export interface FlowAggregates {
  /** Sum of input nodes currently producing (W). */
  productionW: number;
  /** Import/export through tariff-priced two-way nodes (W). */
  pricedInW: number;
  pricedOutW: number;
  /** Flow through unpriced two-way nodes, e.g. a battery (W). */
  storageInW: number;
  storageOutW: number;
  /** Sum of output nodes, measured and remainder (W). */
  consumptionW: number;
}

export function aggregate(nodes: readonly ResolvedNode[]): FlowAggregates {
  const agg: FlowAggregates = {
    productionW: 0,
    pricedInW: 0,
    pricedOutW: 0,
    storageInW: 0,
    storageOutW: 0,
    consumptionW: 0,
  };
  for (const node of nodes) {
    if (node.kind === "input") {
      if (node.direction === "in") agg.productionW += node.watts;
    } else if (node.kind === "output") {
      agg.consumptionW += node.watts;
    } else if (node.direction === "in") {
      if (node.priced) agg.pricedInW += node.watts;
      else agg.storageInW += node.watts;
    } else if (node.direction === "out") {
      if (node.priced) agg.pricedOutW += node.watts;
      else agg.storageOutW += node.watts;
    }
  }
  return agg;
}

/**
 * Map aggregates onto the legacy role-based FlowState: inputs read as solar,
 * priced two-way as grid, unpriced two-way as battery. Keeps `describeFlow`
 * and `computeCost` working for migrated energy configs; exotic node sets get
 * approximate wording until the widget's identity is generalized (spec step 5).
 */
export function toFlowState(nodes: readonly ResolvedNode[]): FlowState {
  const agg = aggregate(nodes);
  const inputs = nodes.filter((n) => n.kind === "input" && n.configured);
  return {
    solarW: agg.productionW,
    gridImportW: agg.pricedInW,
    gridExportW: agg.pricedOutW,
    batteryChargeW: agg.storageOutW,
    batteryDischargeW: agg.storageInW,
    homeW: agg.consumptionW,
    solarSleeping: inputs.length > 0 && inputs.every((n) => n.resting),
  };
}

/** True if no node carries any configured entity. */
export function isUnconfigured(flow: ResolvedFlow): boolean {
  return flow.nodes.every((n) => !n.configured);
}

/** Every sensor-backed node reads unavailable → the whole widget is. */
export function allStale(flow: ResolvedFlow): boolean {
  const measured = flow.nodes.filter((n) => n.configured && !n.remainder);
  return measured.length > 0 && measured.every((n) => n.stale);
}

/** Nothing meaningfully flowing anywhere. */
export function isIdle(flow: ResolvedFlow): boolean {
  return (
    flow.hubW <= ACTIVE_THRESHOLD &&
    flow.nodes.every((n) => n.watts <= ACTIVE_THRESHOLD || n.direction === "idle")
  );
}
