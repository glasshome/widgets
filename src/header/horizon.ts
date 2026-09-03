export interface SunTimes {
  sunrise: Date | null;
  sunset: Date | null;
}

/** Where `now` sits between sunrise and sunset, 0 to 1. Null when the sun
 *  entity gives no usable window, so the band can stay away. */
export function dayProgress(now: Date, times: SunTimes): number | null {
  const { sunrise, sunset } = times;
  if (!sunrise || !sunset) return null;
  const span = sunset.getTime() - sunrise.getTime();
  if (span <= 0) return null;
  const t = (now.getTime() - sunrise.getTime()) / span;
  return Math.min(1, Math.max(0, t));
}

/** A shallow arc across `width`, peaking `height` above its ends. */
export function arcPath(width: number, height: number): string {
  return `M 0 ${height} Q ${width / 2} ${-height * 0.9} ${width} ${height}`;
}

/** The point on that arc at `t`, for the now marker. */
export function arcPoint(width: number, height: number, t: number): { x: number; y: number } {
  const p0 = { x: 0, y: height };
  const p1 = { x: width / 2, y: -height * 0.9 };
  const p2 = { x: width, y: height };
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parse(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Today's daylight window from a `sun.sun` entity, whose next_rising and
 *  next_setting are both in the future: by day the sunrise already happened,
 *  and at night the nearer of the coming day and the one that just ended wins. */
export function sunWindow(
  state: string | undefined,
  nextRising: string | undefined,
  nextSetting: string | undefined,
  now: Date = new Date(),
): SunTimes {
  const rising = parse(nextRising);
  const setting = parse(nextSetting);
  if (!rising || !setting) return { sunrise: null, sunset: null };

  if (state === "above_horizon") {
    return { sunrise: new Date(rising.getTime() - DAY_MS), sunset: setting };
  }

  const coming = { sunrise: rising, sunset: setting };
  const ended = {
    sunrise: new Date(rising.getTime() - DAY_MS),
    sunset: new Date(setting.getTime() - DAY_MS),
  };
  const distance = (w: { sunrise: Date; sunset: Date }) =>
    Math.abs((w.sunrise.getTime() + w.sunset.getTime()) / 2 - now.getTime());
  return distance(coming) <= distance(ended) ? coming : ended;
}
