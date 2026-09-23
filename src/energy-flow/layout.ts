/**
 * Render-tier selection for the energy-flow widget.
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
  if (width >= 340 && height >= 230) return "full";
  return "mid";
}
