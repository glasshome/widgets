/** Share of the backdrop's height where its horizon sits; the photo is pinned there. */
export const HORIZON = 0.7;
const APEX = 0.36;
const LEFT = 0.44;
const RIGHT = 0.94;

export interface SkyPosition {
  body: "sun" | "moon";
  /** 0 at the left horizon, 1 at the right. */
  t: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// The sun shows only while it is up; HA's progress places it, the clock stands in without one.
export function skyProgress(now: Date, sunUp: boolean, progress?: number): SkyPosition {
  const body = sunUp ? "sun" : "moon";
  if (progress !== undefined) return { body, t: clamp01(progress) };
  const hours = now.getHours() + now.getMinutes() / 60;
  if (sunUp) return { body, t: clamp01((hours - 6) / 12) };
  return { body, t: clamp01(((hours + 6) % 24) / 12) };
}

export function arcPoint(
  t: number,
  box: { width: number; height: number },
): { x: number; y: number } {
  const x0 = box.width * LEFT;
  const x1 = box.width * RIGHT;
  const horizon = box.height * HORIZON;
  const apex = box.height * APEX;
  return { x: x0 + (x1 - x0) * t, y: horizon - (horizon - apex) * Math.sin(Math.PI * t) };
}

export function skyScene(phase: "day" | "dusk" | "night" | "dawn"): "day" | "dusk" | "night" {
  if (phase === "night") return "night";
  return phase === "day" ? "day" : "dusk";
}
