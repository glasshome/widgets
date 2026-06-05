import { For } from "solid-js";
import { energyColors } from "../_energy-shared";

interface Stratum {
  color: string;
  fraction: number;
}

interface LiquidHouseProps {
  solarW: number;
  batteryW: number;
  gridW: number;
}

/**
 * House glyph filled bottom-up with horizontal strata proportional to the
 * current source mix. The glyph path matches _energy-shared's houseGlyphPath
 * (24x24 space) and clips the colored bands.
 */
const HOUSE_PATH = "M12 3 L3 10 V21 H21 V10 Z";

function strata(props: LiquidHouseProps): Stratum[] {
  const total = props.solarW + props.batteryW + props.gridW;
  if (total <= 0) return [];
  return [
    { color: energyColors.solar, fraction: props.solarW / total },
    { color: energyColors.battery, fraction: props.batteryW / total },
    { color: energyColors.grid, fraction: props.gridW / total },
  ].filter((s) => s.fraction > 0);
}

export function LiquidHouse(props: LiquidHouseProps) {
  const bands = () => {
    const out: Array<{ color: string; y: number; h: number }> = [];
    // Fill region inside the glyph spans roughly y=3 (peak) to y=21 (base).
    const top = 3;
    const bottom = 21;
    const span = bottom - top;
    let cursor = bottom;
    for (const s of strata(props)) {
      const h = s.fraction * span;
      out.push({ color: s.color, y: cursor - h, h });
      cursor -= h;
    }
    return out;
  };

  return (
    <svg viewBox="0 0 24 24" class="h-full w-full" aria-hidden="true">
      <defs>
        <clipPath id="ef-house-clip">
          <path d={HOUSE_PATH} />
        </clipPath>
      </defs>
      <g clip-path="url(#ef-house-clip)">
        <For each={bands()}>
          {(band) => (
            <rect x="0" y={band.y} width="24" height={band.h} fill={band.color} opacity="0.55" />
          )}
        </For>
      </g>
      <path
        d={HOUSE_PATH}
        fill="none"
        stroke="currentColor"
        stroke-width="1"
        stroke-linejoin="round"
        class="text-foreground/30"
      />
    </svg>
  );
}
