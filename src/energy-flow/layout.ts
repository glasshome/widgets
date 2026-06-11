/**
 * Render-tier selection for the energy-flow widget. The ribbon/node geometry
 * lives in the shared `_flow-graph` module now; this file only owns the
 * glance/mid/full threshold, which is widget-specific, not graph layout.
 */

export type Tier = "glance" | "mid" | "full";

/**
 * Pick the render tier from measured shell dimensions.
 *
 * - glance: too short for any topology — single headline line.
 * - mid: liquid-house glyph under the headline.
 * - full: the source -> home -> spend spine.
 */
export function selectTier(width: number, height: number): Tier {
  if (height < 150) return "glance";
  if (width >= 360 && height >= 300) return "full";
  return "mid";
}
