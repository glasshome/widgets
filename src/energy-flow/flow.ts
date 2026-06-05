/**
 * Derive per-node power and a FlowState from config + a power lookup.
 *
 * The lookup is `(entityId) => number | null` (null = unavailable/unknown),
 * keeping this module DOM-free and unit-testable. Grid and battery support
 * either dual sensors or a single signed sensor via `normalizeBidirectional`.
 */

// Import the leaf modules (not the barrel): the barrel re-exports colors.ts,
// which pulls the DOM-only SDK and breaks server-side unit tests.
import {
  type BidirectionalInput,
  calculateHomeConsumption,
  normalizeBidirectional,
} from "../_energy-shared/calculations";
import type { FlowState } from "../_energy-shared/formatting";
import type { EnergyFlowConfig } from "./config";

export type PowerLookup = (entityId: string) => number | null;

export interface NodeState {
  /** Configured (at least one entity selected for this node). */
  configured: boolean;
  /** Any backing entity is unavailable. */
  stale: boolean;
  /** Magnitude shown on the node (W). */
  watts: number;
  /** State of charge (%) if an SOC entity is configured and available. */
  soc?: number;
}

export interface EnergyFlow {
  solar: NodeState;
  grid: NodeState & { direction: "import" | "export" | "idle" };
  battery: NodeState & { direction: "charge" | "discharge" | "idle" };
  home: NodeState;
  ev: NodeState;
  flowState: FlowState;
  solarSleeping: boolean;
}

function first(ids: string[]): string | undefined {
  return ids.length > 0 ? ids[0] : undefined;
}

interface Resolved {
  watts: number;
  stale: boolean;
  configured: boolean;
}

function resolveSingle(id: string | undefined, lookup: PowerLookup): Resolved {
  if (!id) return { watts: 0, stale: false, configured: false };
  const v = lookup(id);
  if (v === null) return { watts: 0, stale: true, configured: true };
  return { watts: v, stale: false, configured: true };
}

/** Resolve a bidirectional node (dual sensors OR a single signed sensor). */
function resolveBidirectional(
  posId: string | undefined,
  negId: string | undefined,
  signedId: string | undefined,
  lookup: PowerLookup,
): { flow: { positive: number; negative: number }; stale: boolean; configured: boolean } {
  if (signedId) {
    const v = lookup(signedId);
    if (v === null) {
      return { flow: { positive: 0, negative: 0 }, stale: true, configured: true };
    }
    const input: BidirectionalInput = { signed: v };
    const n = normalizeBidirectional(input);
    return { flow: { positive: n.import, negative: n.export }, stale: false, configured: true };
  }
  if (posId || negId) {
    const pos = posId ? lookup(posId) : 0;
    const neg = negId ? lookup(negId) : 0;
    const stale = pos === null || neg === null;
    const input: BidirectionalInput = {
      importValue: pos ?? 0,
      exportValue: neg ?? 0,
    };
    const n = normalizeBidirectional(input);
    return { flow: { positive: n.import, negative: n.export }, stale, configured: true };
  }
  return { flow: { positive: 0, negative: 0 }, stale: false, configured: false };
}

export function deriveFlow(
  config: EnergyFlowConfig,
  lookup: PowerLookup,
  sunBelowHorizon: boolean,
): EnergyFlow {
  const solar = resolveSingle(first(config.solarEntity), lookup);

  const grid = resolveBidirectional(
    first(config.gridImportEntity),
    first(config.gridExportEntity),
    first(config.gridSignedEntity),
    lookup,
  );

  const battery = resolveBidirectional(
    first(config.batteryChargeEntity),
    first(config.batteryDischargeEntity),
    first(config.batterySignedEntity),
    lookup,
  );

  const consumersResolved = config.consumerEntities.map((id) => lookup(id));
  const homeDirect = resolveSingle(first(config.homeEntity), lookup);

  const homeW = calculateHomeConsumption(config.homeStrategy, {
    homeW: homeDirect.watts,
    grid: grid.configured
      ? { importValue: grid.flow.positive, exportValue: grid.flow.negative }
      : undefined,
    solarW: solar.watts,
    battery: battery.configured
      ? { importValue: battery.flow.positive, exportValue: battery.flow.negative }
      : undefined,
    consumersW: consumersResolved.map((v) => v ?? 0),
  });

  const ev = resolveSingle(first(config.evEntity), lookup);

  const batterySocId = first(config.batterySocEntity);
  const batterySoc = batterySocId ? lookup(batterySocId) : null;
  const evSocId = first(config.evSocEntity);
  const evSoc = evSocId ? lookup(evSocId) : null;

  const homeConfigured =
    config.homeStrategy === "entity"
      ? homeDirect.configured
      : config.homeStrategy === "sum_consumers"
        ? config.consumerEntities.length > 0
        : solar.configured || grid.configured;

  const solarSleeping = sunBelowHorizon && solar.watts <= 0;

  const flowState: FlowState = {
    solarW: solar.watts,
    gridImportW: grid.flow.positive,
    gridExportW: grid.flow.negative,
    batteryChargeW: battery.flow.positive,
    batteryDischargeW: battery.flow.negative,
    homeW,
    solarSleeping,
  };

  return {
    solar: {
      configured: solar.configured,
      stale: solar.stale,
      watts: solar.watts,
    },
    grid: {
      configured: grid.configured,
      stale: grid.stale,
      watts: grid.flow.positive > 0 ? grid.flow.positive : grid.flow.negative,
      direction:
        grid.flow.positive > 0 ? "import" : grid.flow.negative > 0 ? "export" : "idle",
    },
    battery: {
      configured: battery.configured,
      stale: battery.stale,
      watts: battery.flow.positive > 0 ? battery.flow.positive : battery.flow.negative,
      soc: batterySoc ?? undefined,
      direction:
        battery.flow.positive > 0 ? "charge" : battery.flow.negative > 0 ? "discharge" : "idle",
    },
    home: {
      configured: homeConfigured,
      stale: homeDirect.stale,
      watts: homeW,
    },
    ev: {
      configured: ev.configured,
      stale: ev.stale,
      watts: ev.watts,
      soc: evSoc ?? undefined,
    },
    flowState,
    solarSleeping,
  };
}

/** Net grid power, signed: positive = importing, negative = exporting. */
export function netPower(flow: EnergyFlow): number {
  const g = flow.grid;
  if (g.direction === "import") return g.watts;
  if (g.direction === "export") return -g.watts;
  return 0;
}

/** True if no node carries any configured entity. */
export function isUnconfigured(flow: EnergyFlow): boolean {
  return (
    !flow.solar.configured &&
    !flow.grid.configured &&
    !flow.battery.configured &&
    !flow.home.configured &&
    !flow.ev.configured
  );
}
