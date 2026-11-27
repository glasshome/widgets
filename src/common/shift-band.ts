export const round1 = (v: number) => Math.round(v * 10) / 10;

export function shiftBand(values: number[], delta: number, min: number, max: number): number[] {
  if (values.length === 0) return values;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const d = Math.min(Math.max(delta, min - lo), max - hi);
  return values.map((v) => round1(v + d));
}
