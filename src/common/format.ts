export function formatTemperature(value: number | undefined, unit?: string): string {
  if (value === undefined || value === null) return "--";
  const u = unit ?? "C";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}°${u}`;
}
