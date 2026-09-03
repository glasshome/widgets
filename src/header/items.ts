export interface EntitySnapshot {
  id: string;
  state: string;
  name?: string;
  unit?: string;
  icon?: string;
}

export interface DomainSpec {
  /** The state that is worth a chip. */
  activeState: string;
  icon: string;
  tone: string;
  label: string;
  service: { domain: string; name: string };
}

export const DOMAIN_SPECS: Record<string, DomainSpec> = {
  light: {
    activeState: "on",
    icon: "mdi:lightbulb-on",
    tone: "text-warning",
    label: "Turn off lights",
    service: { domain: "light", name: "turn_off" },
  },
  lock: {
    activeState: "unlocked",
    icon: "lucide:unlock",
    tone: "text-destructive/80",
    label: "Lock doors",
    service: { domain: "lock", name: "lock" },
  },
  cover: {
    activeState: "open",
    icon: "mdi:window-shutter-open",
    tone: "text-primary",
    label: "Close covers",
    service: { domain: "cover", name: "close_cover" },
  },
  switch: {
    activeState: "on",
    icon: "mdi:power-plug",
    tone: "text-primary",
    label: "Turn off switches",
    service: { domain: "switch", name: "turn_off" },
  },
  fan: {
    activeState: "on",
    icon: "mdi:fan",
    tone: "text-primary",
    label: "Turn off fans",
    service: { domain: "fan", name: "turn_off" },
  },
};

export type ChipConfig =
  | { shows: "watch"; domain: string }
  | { shows: "entity"; entityId: string[] }
  | { shows: "action"; entityId: string[] };

export interface ResolvedChip {
  label: string;
  icon: string;
  tone?: string;
  /** Null renders an icon-only chip. */
  value: string | null;
  ids: string[];
  service?: { domain: string; name: string };
}

const RUNNABLE: Record<string, string> = {
  scene: "turn_on",
  script: "turn_on",
  button: "press",
  input_button: "press",
  automation: "trigger",
};

function domainOf(entityId: string): string {
  return entityId.split(".")[0] ?? "";
}

/** One chip against the entities in scope, or null when it has nothing to say. */
export function resolveChip(chip: ChipConfig, entities: EntitySnapshot[]): ResolvedChip | null {
  if (chip.shows === "watch") {
    const spec = DOMAIN_SPECS[chip.domain];
    if (!spec) return null;
    const ids = entities
      .filter((e) => domainOf(e.id) === chip.domain && e.state === spec.activeState)
      .map((e) => e.id);
    if (ids.length === 0) return null;
    return {
      label: spec.label,
      icon: spec.icon,
      tone: spec.tone,
      value: String(ids.length),
      ids,
      service: spec.service,
    };
  }

  const id = chip.entityId[0];
  if (!id) return null;

  if (chip.shows === "action") {
    const name = RUNNABLE[domainOf(id)];
    if (!name) return null;
    const entity = entities.find((e) => e.id === id);
    return {
      label: entity?.name ?? id,
      icon: entity?.icon ?? "mdi:play",
      value: null,
      ids: [id],
      service: { domain: domainOf(id), name },
    };
  }

  const entity = entities.find((e) => e.id === id);
  if (!entity) return null;
  return {
    label: entity.name ?? id,
    icon: entity.icon ?? "mdi:gauge",
    value: entity.unit ? `${entity.state} ${entity.unit}` : entity.state,
    ids: [id],
  };
}

/** The title keeps this much, each chip needs this much. */
const TITLE_WIDTH = 240;
const CHIP_WIDTH = 84;

/** How many chips fit, dropping from the end. Width 0 means unmeasured. */
export function visibleCount(width: number, total: number): number {
  if (width === 0) return total;
  return Math.max(0, Math.min(total, Math.floor((width - TITLE_WIDTH) / CHIP_WIDTH)));
}

/** "Somewhere specific" with nowhere chosen: show nothing rather than the
 *  whole home, which is a different answer. */
export function needsArea(config: { scope: string; areaId?: string }): boolean {
  return config.scope === "area" && !config.areaId;
}
