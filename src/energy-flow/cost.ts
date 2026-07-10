/**
 * Turn live power (W) into running cost rates using the configured tariff.
 *
 * The widget only knows instantaneous power, not accumulated energy, so cost is
 * expressed as a rate (currency/hour): power (kW) x price (per kWh). DOM-free and
 * unit-tested, mirroring flow.ts.
 */

import { formatMoney, type FlowState } from "../_energy-shared/formatting";

export interface Tariff {
  currency?: string;
  rate?: number;
}

export interface EnergyCost {
  currency: string;
  /** Grid spend rate (currency/h). Positive = importing (spending), negative = exporting (earning). */
  gridPerHour: number;
  /** Value of self-consumed solar (currency/h): solar not sold to the grid, priced at the tariff. */
  solarSavingPerHour: number;
}

/**
 * Null when the tariff is incomplete: both a non-empty currency symbol and a
 * positive rate are required, matching the config's "set together" guidance.
 */
export function computeCost(state: FlowState, tariff: Tariff): EnergyCost | null {
  const currency = tariff.currency?.trim();
  const rate = tariff.rate;
  if (!currency || rate === undefined || !Number.isFinite(rate) || rate <= 0) return null;

  const solar = state.solarW ?? 0;
  const gridImport = state.gridImportW ?? 0;
  const gridExport = state.gridExportW ?? 0;

  const gridPerHour = ((gridImport - gridExport) / 1000) * rate;
  const solarSavingPerHour = (Math.max(0, solar - gridExport) / 1000) * rate;

  return { currency, gridPerHour, solarSavingPerHour };
}

// Below this the rate rounds to 0.00/h, so callers show nothing rather than a
// "€0.00/h" line.
const COST_THRESHOLD = 0.005;

/** Grid chip/legend sub-line: bare cost while importing, "Earns …" while
 *  exporting (the node label already carries the direction). Null when idle. */
export function gridCostSub(cost: EnergyCost | null): string | undefined {
  if (!cost) return undefined;
  const perHour = `${formatMoney(cost.gridPerHour, cost.currency)}/h`;
  if (cost.gridPerHour > COST_THRESHOLD) return perHour;
  if (cost.gridPerHour < -COST_THRESHOLD) return `Earns ${perHour}`;
  return undefined;
}

/** Solar chip/legend sub-line: value of self-consumed solar. Null when none. */
export function solarSavingSub(cost: EnergyCost | null): string | undefined {
  if (!cost || cost.solarSavingPerHour <= COST_THRESHOLD) return undefined;
  return `Saves ${formatMoney(cost.solarSavingPerHour, cost.currency)}/h`;
}
