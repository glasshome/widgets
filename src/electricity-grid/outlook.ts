export interface OutlookHour {
  start: Date;
  price: number;
}

interface Slot {
  start: Date;
  value: number;
}

function slots(list: unknown, startKey: string, valueKey: string): Slot[] {
  if (!Array.isArray(list)) return [];
  const out: Slot[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const start = new Date(String(rec[startKey]));
    const value = Number(rec[valueKey]);
    if (Number.isNaN(start.getTime()) || !Number.isFinite(value)) continue;
    out.push({ start, value });
  }
  return out;
}

/** Price forecast a price sensor carries: Nord Pool's raw_today/raw_tomorrow, or ENTSO-e's prices. */
function forecastSlots(attributes: Record<string, unknown>): Slot[] {
  return [
    ...slots(attributes.raw_today, "start", "value"),
    ...slots(attributes.raw_tomorrow, "start", "value"),
    ...slots(attributes.prices, "time", "price"),
  ];
}

/** The next `count` whole hours after `now`, each the mean of its slots (sensors may report every 15 minutes). */
export function outlook(attributes: Record<string, unknown>, now: Date, count = 4): OutlookHour[] {
  const hours = new Map<number, { sum: number; n: number }>();
  for (const slot of forecastSlots(attributes)) {
    const hour = new Date(slot.start);
    hour.setMinutes(0, 0, 0);
    const key = hour.getTime();
    const acc = hours.get(key) ?? { sum: 0, n: 0 };
    acc.sum += slot.value;
    acc.n += 1;
    hours.set(key, acc);
  }
  const current = new Date(now);
  current.setMinutes(0, 0, 0);
  return [...hours.entries()]
    .filter(([key]) => key > current.getTime())
    .sort(([a], [b]) => a - b)
    .slice(0, count)
    .map(([key, acc]) => ({ start: new Date(key), price: acc.sum / acc.n }));
}
