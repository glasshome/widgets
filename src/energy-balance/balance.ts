// DOM-free so it stays unit-testable; the widget resolves statistics and
// hands plain numbers in.

/** Live net at or below this magnitude reads as balanced (W). */
export const NET_THRESHOLD_W = 50;

export interface BalanceInputs {
  producedKWh: number;
  gridImportKWh: number;
  gridExportKWh: number;
  batteryChargeKWh: number;
  batteryDischargeKWh: number;
  /** Measured home consumption; null derives it from the energy balance. */
  homeKWh: number | null;
}

export type BalanceStatus = "import" | "export" | "balanced";

export interface BalanceState {
  /** At least solar + grid-import statistics are configured. */
  configured: boolean;
  producedKWh: number;
  consumedKWh: number;
  gridImportKWh: number;
  gridExportKWh: number;
  /** 0..1 share of consumption covered by non-grid energy (the amber arc). */
  selfSufficiency: number;
  /** Live net grid power (W): positive = importing, negative = exporting. */
  netW: number;
  status: BalanceStatus;
}

// Clamped at 0 so sensor noise never yields a negative home load.
export function deriveConsumption(i: BalanceInputs): number {
  if (i.homeKWh !== null) return Math.max(0, i.homeKWh);
  const c =
    i.producedKWh + i.gridImportKWh - i.gridExportKWh + i.batteryDischargeKWh - i.batteryChargeKWh;
  return Math.max(0, c);
}

/** Share of home consumption NOT drawn from the grid, clamped to 0..1. */
export function selfSufficiency(consumedKWh: number, gridImportKWh: number): number {
  if (consumedKWh <= 0) return 0;
  const s = (consumedKWh - gridImportKWh) / consumedKWh;
  return Math.min(1, Math.max(0, s));
}

export function statusFromNet(netW: number): BalanceStatus {
  if (netW > NET_THRESHOLD_W) return "import";
  if (netW < -NET_THRESHOLD_W) return "export";
  return "balanced";
}

export function deriveBalance(
  inputs: BalanceInputs,
  netW: number,
  configured: boolean,
): BalanceState {
  const consumedKWh = deriveConsumption(inputs);
  return {
    configured,
    producedKWh: inputs.producedKWh,
    consumedKWh,
    gridImportKWh: inputs.gridImportKWh,
    gridExportKWh: inputs.gridExportKWh,
    selfSufficiency: selfSufficiency(consumedKWh, inputs.gridImportKWh),
    netW,
    status: statusFromNet(netW),
  };
}
