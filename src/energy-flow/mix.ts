/**
 * Supply-mix share math for the mid-tier bar. Pure — no SolidJS, no DOM.
 */

export interface MixEntry {
  id: string;
  watts: number;
}

export interface MixShare {
  id: string;
  watts: number;
  fraction: number;
}

/** Share of each active supplier in the current supply. Negative readings
 *  clamp to 0; an all-zero input yields no shares (the bar renders an empty
 *  track). */
export function sourceMix(entries: readonly MixEntry[]): MixShare[] {
  const clamped = entries.map((e) => ({ id: e.id, watts: Math.max(0, e.watts) }));
  const total = clamped.reduce((sum, e) => sum + e.watts, 0);
  if (total <= 0) return [];
  return clamped
    .filter((e) => e.watts > 0)
    .map((e) => ({ id: e.id, watts: e.watts, fraction: e.watts / total }));
}
