/**
 * Source-mix share math for the mid-tier bar. Pure — no SolidJS, no DOM.
 */

export type MixRole = "solar" | "battery" | "grid";

export interface MixShare {
  role: MixRole;
  watts: number;
  fraction: number;
}

export interface MixInput {
  solarW: number;
  batteryW: number;
  gridW: number;
}

/** Share of each active source in the current supply. Negative readings clamp
 *  to 0; an all-zero input yields no shares (the bar renders an empty track). */
export function sourceMix(input: MixInput): MixShare[] {
  const entries: Array<[MixRole, number]> = [
    ["solar", Math.max(0, input.solarW)],
    ["battery", Math.max(0, input.batteryW)],
    ["grid", Math.max(0, input.gridW)],
  ];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return [];
  return entries
    .filter(([, w]) => w > 0)
    .map(([role, w]) => ({ role, watts: w, fraction: w / total }));
}
